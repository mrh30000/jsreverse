# 结合DrissionPage、OCR、OpenCV，实现WEB中canvas元素自动化

> **作者**: Lyss07 | **发布时间**: 2024-11-05 09:40:00 | **版块**: 『编程语言区』 | **查看/回复**: 3143 / 10
> **原文**: [https://www.52pojie.cn/thread-1978507-1-1.html](https://www.52pojie.cn/thread-1978507-1-1.html)

---

*本帖最后由 Lyss07 于 2024-11-5 09:43 编辑*

  因为工作中遇到类似的需求（需要对某C/S架构改造为B/S架构的某系统，进行自动化测试及相应定制的自动化框架改造、重构），其中，该系统将以前的C/S架构，gui画的界面直接平移到Web框架中，运用了canvas画布元素，从而减少了代码的改造和重构。因此，遇到了需要在画布元素中进行自动化测试的需求。
  简言之，一个画布元素中包含了各种按钮、下拉框等等操作，但通过DrissionPage(或者类selenium)的库，识别的时候，获取不到画布中的按钮等元素的定位，从而在实现自动化时无法通过直接相关元素信息直接操作。
  一般地，两个思路，一个是进行抓包，获取操作canvas时发送的数据及相关操作，模拟进行，但由于（<del>我太菜了</del>）某系统涉及分工比较细，而且人员分布较为广，类似的尝试不太好启动；
第二个思路是，通过截图或者识别canvas画布当前的图像，利用OpenCV进行图片模板匹配,从而实现自动化。故，我综合了内部的一些思路和一点个人想法，学习和利用DrissionPage中的思路，将canvas元素视为一个特殊的页面元素，实现了一个第二个思路的解决方案。
  实现的代码：（gitee上：https://gitee.com/lz-lyss/canvas-element-automation） ，这里只简单写下主要的代码，其他部分可以看下我代码库的链接

[Python] *纯文本查看*

```

# -*- coding:utf-8 -*-

import os
from typing import NoReturn, Any

from DrissionPage._units.waiter import ElementWaiter
from DrissionPage.items import ChromiumElement
from DrissionPage.errors import ElementNotFoundError
# from DrissionPage import WebPage

from src import CANVAS_BASE_SRC_PATH
from src._typing import MatchLocation
from src._base import logger
from src._items.location_clicker import LocationClicker

__all__ = ('is_canvas', 'CanvasElement')

class CanvasElement(ChromiumElement):

    # 原始画布元素
    _src_canvas: ChromiumElement | None = None
    # 原始画布元素在页面中的位置
    _src_location: MatchLocation | None = None

    def __init__(self, chrome_ele: ChromiumElement):
        """
        画布元素
        Args:
            chrome_ele(ChromiumElement): 原始画布元素,从上述操作中传入的ChromiumElement对象
        """
        super().__init__(chrome_ele.owner, node_id=chrome_ele._node_id)
        if not is_canvas(self):
            raise TypeError(f'当前元素（{self.tag}） 不是Canvas元素，无法使用CanvasElement.')
        # 页面属性
        self.tab = self.owner.tab
        # 类型
        self._type = 'CanvasElement'
        # 更新原始画布元素属性
        self._src_canvas: ChromiumElement | None = chrome_ele
        # 更新滚动元素属性
        self._scroll = self._src_canvas.scroll
        # 更新原始画布元素在页面中的位置
        # [self._src_canvas.rect.location[0], self._src_canvas.rect.location[1]]
        self._src_location: MatchLocation | None = self._src_canvas.rect.location
        # 原始画布元素保存到的截图路径
        self._src_image_path: str | None = None
        # 元素操作动作
        self._clicker: LocationClicker | None = None
        # 元素等待动作
        self._wait: ElementWaiter | None = None
        # 元素查找文字动作
        self._find_text = None

    @property
    def click(self) -> LocationClicker:
        """
        返回用于点击的对象
        Returns:

        """
        if self._clicker is None:
            self._clicker = LocationClicker(self)
        return self._clicker

    @property
    def wait(self):
        """
        返回用于等待的对象
        Returns:

        """
        if self._wait is None:
            self._wait = ElementWaiter(self.owner, self)
        return self._wait

    @property
    def scroll(self):
        return self._scroll

    @property
    def src_image_path(self) -> str | None:
        """
        返回原始画布元素保存到的截图路径
        Returns:
            str|None: 截图路径
        """
        return self._src_image_path

    @staticmethod
    def __default_image_name(i_name: str):
        """
        设置默认图片名称,默认保存成高清的jpeg文件
        Args:
            i_name(str): 图片名称

        Returns:
            res_name(str): 图片名称

        """
        res_name = os.path.splitext(i_name)[0]
        file_extension = os.path.splitext(i_name)[1]
        match file_extension:
            case '.jpg' | '.jpeg' | '.png' | '.webp':
                res_name = i_name
            case _:
                res_name = f'{res_name}.jpeg'
        return res_name

    # 暂不启用二次初始化方法，不符合类的设计原则
    # def __update_init(self,  page: WebPage | None = None, ele_str: str | None = None) -> NoReturn:
    #     """
    #     更新初始化, 用于更新原始画布元素
    #     Returns:
    #
    #     """
    #     if not page:
    #         page = self.owner.tab.page
    #     # 更新原始画布元素
    #     if ele_str:
    #         tar_ele = page.ele(ele_str)
    #     else:
    #         tar_ele = page.ele('x://canvas')
    #     self.__init__(tar_ele)

    def __update_src_canvas_picture(self, name: str | None = None):
        if not name:
            import time
            time_str = time.strftime('%Y%m%d%H%M%S', time.localtime())
            name = f'basic_canvas_{time_str}'
        self.save_to_picture(name=name)

    def save_to_picture(self, name: str | None = None,
                        path: str = CANVAS_BASE_SRC_PATH,
                        as_bytes=None,
                        as_base64=None,
                        scroll_to_center=True) -> bytes | str:
        """
        将元素截图,并保存到本地
        Args:
            path(str): 保存路径
            name(str): 完整文件名，后缀可选 'jpg','jpeg','png','webp', 不传时默认保存成更高清的jpeg文件
            as_bytes(bool|str): 是否以字节形式返回图片，可选 'jpg','jpeg','png','webp'，生效时path参数和as_base64参数无效
            as_base64(bool|str): 是否以base64字符串形式返回图片，可选 'jpg','jpeg','png','webp'，生效时path参数无效
            scroll_to_center(bool): 截图前是否滚动到视口中央

        Returns:
            ret_path(bytes|str): 图片完整路径或字节文本

        """
        if scroll_to_center:
            self.scroll.to_see(center=True)

        left, top = self.rect.location
        width, height = self.rect.size
        left_top = (left, top)
        right_bottom = (left + width, top + height)
        if not name:
            name = f'{self.tag}.jpeg'
        else:
            # 处理下文件名，如果没传文件名后缀，默认保存成更高清的jpeg文件
            name = self.__default_image_name(name)

        # 更新截图路径
        self._src_image_path = os.path.abspath(os.path.join(path, name))

        return self.owner._get_screenshot(path, name, as_bytes=as_bytes, as_base64=as_base64, full_page=False,
                                          left_top=left_top, right_bottom=right_bottom, ele=self)

    def __splice_position(self, target_location: MatchLocation) -> MatchLocation:
        """
        获取拼接位置
        Args:
            target_location(MatchLocation): 目标位置

        Returns:
            res_location(MatchLocation): 拼接位置
        """
        # 默认值取当前默认画布元素的位置
        res_location = self._src_location
        if target_location and len(target_location) == 2:
            res_location = (res_location[0] + target_location[0], res_location[1] + target_location[1])
        else:
            raise ValueError(f'参数错误! 当前像素位置为： {target_location} ,不符合操作动作要求!')

        return res_location

    @staticmethod
    def __get_one_match(match_list: list[MatchLocation], target_number: int | None = 0) -> MatchLocation | None:
        """
        多个位置信息中，获取其中一个指定匹配位置
        Args:
            match_list(list): 匹配位置列表
            target_number(int|None): 目标匹配位置索引，默认为0

        Returns:
            res_location(MatchLocation|None): 匹配位置

        """
        if match_list:
            m_len = len(match_list)
            if target_number is None or target_number >= m_len:
                logger.warning(f'异常的获取索引：{target_number}，将默认取第一个位置信息!')
                target_number = 0
            res_location = match_list[target_number]
        else:
            res_location = None
        return res_location

    # <editor-fold desc="图片模板匹配相关辅助方法">
    def __init_template_match(self):
        """"""
        from src._match import TemplateMatch
        p_match = TemplateMatch(self._src_image_path)
        return p_match

    def _get_location_match(self, template_path: str) -> MatchLocation | None:
        """
        根据模板图片，获取匹配位置
        一个模板，一个最优匹配位置，结果是单个匹配位置
        Args:
            template_path(str): 模板图片路径

        Returns:
            res_location(list|None): 匹配位置，如果没有匹配到合理结果，为None

        """
        t_match = self.__init_template_match()
        match_location = t_match.get_template_location(template_path)
        return match_location

    # </editor-fold>  图片模板匹配相关辅助方法

    # <editor-fold desc="文字匹配相关辅助方法">
    def __init_text_match(self, ocr_engine: str = 'paddleocr', model_path: str | None = None,
                          update_special_symbol: str | None = None):
        """
        初始化文字匹配对象
        Args:
            ocr_engine(str): ocr引擎，默认为paddleocr
            model_path(str|None): 模型路径，默认为None，取当前引擎默认的模型路径
            update_special_symbol(str|None): 更新正则替换的特殊字符，默认为None，取默认的正则替换字符

        Returns:
            t_match(TextMatch): 文字匹配对象

        """
        from src._match import TextMatch
        t_match = TextMatch(image_path=self._src_image_path, engine=ocr_engine, model_path=model_path)
        # 更新正则替换的特殊字符
        if update_special_symbol is not None:
            t_match.update_special_symbol(special_symbol=update_special_symbol)
        return t_match

    # </editor-fold>  文字匹配相关辅助方法

    # <editor-fold desc="图片模板匹配相关操作方法">
    def click_left(self, template_image_path: str,
                   is_update_src_picture: bool = False,
                   update_picture_name: str | None = None) -> NoReturn:
        """
        左键单击
        单个模板，一个最优匹配位置
        Args:
            template_image_path(str): 模板图片路径
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        location = self._get_location_match(template_path=template_image_path)
        if location:
            res_location = self.__splice_position(location)
            self.click.left(res_location)

    def click_right(self, template_image_path: str,
                    is_update_src_picture: bool = False,
                    update_picture_name: str | None = None
                    ) -> NoReturn:
        """
        右键单击
        单个模板，一个最优匹配位置
        Args:
            template_image_path(str): 模板图片路径
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        location = self._get_location_match(template_path=template_image_path)
        if location:
            res_location = self.__splice_position(location)
            self.click.right(res_location)

    def click_middle(self, template_image_path: str,
                     is_update_src_picture: bool = False,
                     update_picture_name: str | None = None) -> NoReturn:
        """
        中键单击(注：其他操作，如滚动等为页面操作，与其他ChromeElement操作一致)
        单个模板，一个最优匹配位置
        Args:
            template_image_path(str): 模板图片路径
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:

        """
        # canvas_ele_str(str|None): 定位canvas元素的字符串，用于更新截图
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        location = self._get_location_match(template_path=template_image_path)
        if location:
            res_location = self.__splice_position(location)
            self.click.middle(res_location)

    def click_with_offset(self, template_image_path: str, offset_x: float = 0, offset_y: float = 0,
                          button: str = 'left',
                          is_update_src_picture: bool = False,
                          update_picture_name: str | None = None) -> NoReturn:
        """
        单次点击，并设置偏移量
        单个模板，一个最优匹配位置
        Args:
            template_image_path(str): 模板图片路径
            offset_x(float): x轴偏移量，横向偏移量
            offset_y(float): y轴偏移量，纵向偏移量
            button(str): 鼠标按键，默认为左键
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        location = self._get_location_match(template_path=template_image_path)
        if location:
            res_location = self.__splice_position(location)
            self.click.at(res_location, offset_x=offset_x, offset_y=offset_y, button=button)

    def multiple_click(self, template_image_path: str, times: int = 2,
                       is_update_src_picture: bool = False,
                       update_picture_name: str | None = None) -> NoReturn:
        """
        多次点击(注：默认多次点击时仅允许左键)
        单个模板，一个最优匹配位置
        Args:
            template_image_path(str): 模板图片路径
            times(int): 点击次数，默认为2次
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        location = self._get_location_match(template_path=template_image_path)
        if location:
            res_location = self.__splice_position(location)
            self.click.multi(res_location, times=times)

    def multiple_click_with_offset(self, template_image_path: str, offset_x: float = 0, offset_y: float = 0,
                                   times: int = 2,
                                   is_update_src_picture: bool = False,
                                   update_picture_name: str | None = None) -> NoReturn:
        """
        多次点击，并设置偏移量(注：默认多次点击时仅允许左键)
        单个模板，一个最优匹配位置
        Args:
            template_image_path(str): 模板图片路径
            offset_x(float): x轴偏移量，横向偏移量
            offset_y(float): y轴偏移量，纵向偏移量
            times(int): 点击次数，默认为2次
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        location = self._get_location_match(template_path=template_image_path)
        if location:
            res_location = self.__splice_position(location)
            self.click.at(res_location, count=times, offset_x=offset_x, offset_y=offset_y)

    def move_to(self, template_image_path: str, offset_x: float = 0, offset_y: float = 0,
                is_update_src_picture: bool = False,
                update_picture_name: str | None = None) -> NoReturn:
        """
        移动鼠标到指定位置
        Args:
            template_image_path(str): 模板图片路径
            offset_x(float): x轴偏移量，横向偏移量
            offset_y(float): y轴偏移量，纵向偏移量
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:

        """
        try:
            if is_update_src_picture:
                # self.__update_init(ele_str=canvas_ele_str)
                self.__update_src_canvas_picture(name=update_picture_name)
            location = self._get_location_match(template_image_path)
            if location:
                res_location = self.__splice_position(location)
                location = (res_location[0], res_location[1])
                self.owner.actions.move_to(location, offset_x=offset_x, offset_y=offset_y)
        except Exception as err:
            logger.error(f'移动鼠标到指定位置失败，{err.__repr__()}')

    def is_exists(self, template_image_path: str,
                  is_update_src_picture: bool = False,
                  update_picture_name: str | None = None) -> bool:
        """
        根据模板图片，判断元素是否存在
        Args:
            template_image_path(str | list): 模板图片路径，单个或多个
                多个时，根据模板文件数量与匹配结果数量进行判断，若匹配结果数量等于模板文件数量，则认为元素存在
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:
            res_exists(bool): 是否存在

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        t_match = self.__init_template_match()
        res_exists = t_match.is_match(template=template_image_path)
        return res_exists

    def is_all_exists(self, template_image_path: str | list,
                      counts: int = 2,
                      is_update_src_picture: bool = False,
                      update_picture_name: str | None = None) -> bool:
        """
        根据模板图片，判断元素是否存在
        单个模板，多个匹配位置 或 多模板
        Args:
            template_image_path(str): 模板图片路径
            counts(int): 匹配结果数量，单模板多目标匹配时可填该值，多模板时不要填！默认为2
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称

        Returns:
            bool: 是否存在

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        t_match = self.__init_template_match()
        res_exists = t_match.is_all_match(templates=template_image_path, match_count=counts)
        return res_exists

    # </editor-fold>  图片模板匹配相关操作方法

    def canvas_input(self, input_val: Any, ele_info: str = None, is_clear: bool = True) -> NoReturn:
        """
        输入文本
        Args:
            input_val(Any): 输入值
            ele_info(str): 辅助定位输入框元素的元素信息，默认缺省时将搜寻canvas元素的兄弟元素中的第一个input元素
            is_clear(bool): 是否清空输入框，默认为True

        Returns:
            NoReturn

        """
        if ele_info:
            tar_input = self.owner.ele(ele_info)
        else:
            tar_input = self.ele('x:../input')
        if not tar_input:
            raise ElementNotFoundError(f'当前页面（{self.owner.url}）未找到可进行输入的输入框元素！')
        # 清空输入框
        if is_clear:
            # 如果需要清空输入框，则先清空
            tar_input.clear()

        # 输入值
        tar_input.owner.actions.type(input_val)

    # <editor-fold desc="文字匹配相关操作方法">
    # 对当前canvas保存的图片进行OCR识别后，定位到文本位置
    # is_filter_special_symbol 针对的是OCR识别到的文字中的特殊字符是否进行过滤，而不是 指定的目标匹配文本中的特殊字符
    def is_text_exists(self, text: str, is_filter_special_symbol: bool = True,
                       is_update_src_picture: bool = False,
                       update_picture_name: str | None = None,
                       **kwargs) -> bool:
        """
        判断指定文本是否存在
        Args:
            text(str): 文本
            is_filter_special_symbol(bool): 是否过滤特殊字符
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称
            kwargs(dict): 其他参数。用于初始化TextMatch时的配置，详情见__init_text_match方法及TextMatch类

        Returns:
            res_match(bool): 是否存在

        """
        # 是否更新当前canvas元素的截图
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        # 初始化TextMatch
        t_match = self.__init_text_match(**kwargs)
        # 获取文字匹配判断结果
        res_match = t_match.text_is_exists(text=text, is_filter_special_symbol=is_filter_special_symbol)
        return res_match

    def is_all_text_exists(self, texts: list[str] | set[str] | tuple[str],
                           is_filter_special_symbol: bool = True,
                           is_update_src_picture: bool = False,
                           update_picture_name: str | None = None,
                           **kwargs) -> bool:
        """
        判断所有指定文本是否存在
        Args:
            texts(list): 文本列表
            is_filter_special_symbol(bool): 是否过滤特殊字符
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称
            kwargs(dict): 其他参数。用于初始化TextMatch时的配置，详情见__init_text_match方法及TextMatch类

        Returns:
            bool: 是否存在

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        # 初始化TextMatch
        t_match = self.__init_text_match(**kwargs)
        # 获取文字匹配判断结果
        res_match = t_match.texts_is_all_exists(text=texts, is_filter_special_symbol=is_filter_special_symbol)
        return res_match

    def click_text(self,
                   text: str,
                   is_filter_special_symbol: bool = True,
                   is_update_src_picture: bool = False,
                   update_picture_name: str | None = None,
                   **kwargs) -> NoReturn:
        """
        点击指定文本
        Args:
            text(str): 文本
            is_filter_special_symbol(bool): 是否过滤特殊字符
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称
            **kwargs(dict): 其他参数。用于初始化TextMatch时的配置，详情见__init_text_match方法及TextMatch类

        Returns:

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        # 初始化TextMatch
        t_match = self.__init_text_match(**kwargs)
        # 获取匹配结果
        match_location = t_match.text_get_match_location(text=text, is_filter_special_symbol=is_filter_special_symbol)
        # 匹配到了
        if match_location:
            # 拼接匹配位置
            location = self.__splice_position(match_location)
            self.click.left(location)

    def multiple_click_text(self,
                            text: str,
                            times: int = 2,
                            is_filter_special_symbol: bool = True,
                            is_update_src_picture: bool = False,
                            update_picture_name: str | None = None,
                            **kwargs
                            ) -> NoReturn:
        """
        点击指定文本,多次
        Args:
            text(str): 文本
            times(int): 点击次数
            is_filter_special_symbol(bool): 是否过滤特殊字符
            is_update_src_picture(bool): 是否更新源图片。即，当前canvas元素发生变化时，需要更新原始默认截图
            update_picture_name(str|None): 更新截图的名称
            **kwargs(dict): 其他参数。用于初始化TextMatch时的配置，详情见__init_text_match方法及TextMatch类

        Returns:

        """
        if is_update_src_picture:
            # self.__update_init(ele_str=canvas_ele_str)
            self.__update_src_canvas_picture(name=update_picture_name)
        # 初始化TextMatch
        t_match = self.__init_text_match(**kwargs)
        # 获取匹配结果
        match_location = t_match.text_get_match_location(text=text, is_filter_special_symbol=is_filter_special_symbol)
        # 匹配到了
        if match_location:
            # 拼接匹配位置
            location = self.__splice_position(match_location)
            self.click.multi(location, times=times)

    # </editor-fold> 文字匹配相关操作方法

def is_canvas(ele: ChromiumElement) -> bool:
    ele_tag = ele.tag
    if 'canvas' in ele_tag:
        return True
    else:
        return False

if __name__ == '__main__':

    from DrissionPage import WebPage

    page = WebPage(mode='d')
    # https://www.bilibili.com/read/cv15814078/
    # https://www.bilibili.com/
    page.get('https://www.bilibili.com/read/cv15814078/')
    # [@class="ring-progress"]
    canvas = page.ele('x://canvas[@class="ring-progress"]')
    # ("2d")
    c_ele = CanvasElement(canvas)
    c_ele.save_to_picture(name='test_canvas')
    # c_ele.move_to(template_image_path='./coin_test.jpeg')
    c_ele.click_right(template_image_path='test_pictures/coin_test.jpeg')
    # context = canvas.get_screenshot('./test_canvas', 'test_canvas.png')
    # c_ele.input('123')
```

  因为这个解决思路我不太确定是不是最好的，但是之前内部测试是可以完成自动化，而且也稍微准确一点点，所以发出来让各位大佬给看下这个思路（请忽略代码水平的问题，谢谢），请多多指教，感谢！
