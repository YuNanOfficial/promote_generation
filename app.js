/* ============================================================
   Krene 提示词工作台 · 本地静态版
   数据来源：krene.com 公开页面采集（806 条原文 / 100 条首页推荐 / 8 篇官方教程）
   无依赖，可直接 file:// 打开
   ============================================================ */
(function () {
'use strict';

/* ---------- 小工具 ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HAS_CJK = /[\u4e00-\u9fff\u3040-\u30ff]/;
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}
function copyText(str) {
  const done = () => toast('已复制到剪贴板');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(str).then(done).catch(() => fallback());
  } else fallback();
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = str; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择文本'); }
    document.body.removeChild(ta);
  }
}

/* ============================================================
   1. 模型定义 —— 每个模型的槽位骨架来自 806 条案例的统计
   ============================================================ */
const MODELS = [
  {
    key: 'niji7', name: 'Niji 7', badge: 'm2',
    tag: '动漫立绘 / 贴纸 / 氛围插画',
    syntax: 'tags', lang: 'en', params: true,
    tip: '标签流：逗号分隔的英文短标签 + 后缀参数。166 条案例里 155 条带 --niji 7，其中 90 条只带它一个；全库 0 条使用 --ar。',
    slots: [
      { k: 'genre', label: '画风 / 体裁', note: 'official anime key visual 等', ph: 'official anime key visual', lib: 'style' },
      { k: 'subject', label: '主体', note: '谁 / 什么', ph: '1 girl' },
      { k: 'look', label: '外貌细节', note: '3–5 项可画特征', ph: 'silver-white short bob hair, large blue eyes, fair skin', lib: 'appearance' },
      { k: 'expression', label: '表情 / 情绪', note: '脸部的样子', ph: 'calm melancholic expression, slight smile', lib: 'mood' },
      { k: 'outfit', label: '服装', note: '分件写', ph: 'navy sailor school uniform, white shirt, red ribbon', lib: 'outfit' },
      { k: 'accessories', label: '配饰', note: '眼镜 / 发饰 / 首饰', ph: 'silver hairpin, round glasses', lib: 'outfit' },
      { k: 'pose', label: '姿态动作', note: '定格瞬间', ph: 'looking back over her shoulder, paused mid-step', lib: 'action', multi: true },
      { k: 'props', label: '道具', note: '手里拿的 / 身边的物件', ph: 'holding a clear plastic bottle of mineral water', lib: 'element', multi: true },
      { k: 'camera', label: '机位与构图', note: '景别+机位+构图', ph: 'full body, eye-level, centered composition', lib: 'shot' },
      { k: 'scene', label: '背景 / 环境', note: '白底就写 white background', ph: 'white background', lib: 'scene' },
      { k: 'element', label: '点缀元素', note: '可选', ph: 'falling cherry blossom petals', lib: 'element', multi: true },
      { k: 'light', label: '光线', note: '方向 + 性质', ph: 'soft rim light from the sunset', lib: 'light' },
      { k: 'color', label: '色彩', note: '色调 + 饱和度', ph: 'vibrant but soft colors', lib: 'color' },
      { k: 'mood', label: '氛围', note: '整体气质', ph: 'quiet, nostalgic atmosphere', lib: 'mood' },
      { k: 'quality', label: '质量词', note: '最多 1–3 个', ph: 'clean lineart, cel shading', lib: 'quality', multi: true },
      { k: 'extra', label: '其他 / 补充', note: '解析剩下的内容，也可自己写', multi: true }
    ],
    sample: {
      genre: 'official anime key visual', subject: '1 girl', look: 'silver-white short bob hair, large sparkling blue eyes, fair skin with soft blush, calm melancholic expression',
      outfit: 'navy sailor school uniform, white shirt, red ribbon, single shoulder bag',
      pose: 'standing on stone steps, paused mid-step, looking back over her shoulder',
      camera: 'medium shot, eye-level, centered composition', scene: 'white background',
      element: 'falling cherry blossom petals', light: 'soft rim light from the sunset',
      color: 'vibrant but soft colors', quality: 'clean lineart, cel shading, gentle gradient'
    }
  },
  {
    key: 'gpt2', name: 'GPT Image-2', badge: 'm0',
    tag: '动漫插画 / 分点式精细控制',
    syntax: 'lines', lang: 'zh', params: false,
    tip: '中文分点式槽位说明（该模型 23% 的优质案例用分点体）。中文占 79%，不吃 -- 参数，可引用参考图。',
    slots: [
      { k: 'style', label: '画风总纲', note: '媒介 + 工艺', ph: '现代日系二次元写实插画，细腻柔和的清晰线稿，平涂叠加薄涂渐变', lib: 'style' },
      { k: 'ref', label: '参考图与一致性', note: '用了参考图就先锁身份', ph: '参考图1的角色，保持五官、发型、服装与配饰完全一致，不要修改角色设计' },
      { k: 'subject', label: '主体', note: '身份 + 外貌分项', ph: '银白色短发的少女，琥珀色眼睛，白皙皮肤', multi: true },
      { k: 'look', label: '外貌细节', note: '脸 / 发 / 瞳 / 身材', ph: '银白色短波波头，琥珀色眼睛，白皙皮肤，清瘦身形' },
      { k: 'outfit', label: '服装配饰', note: '分件写材质', ph: '藏青色水手服上衣，白色衬衫，红色领结，单肩学生包' },
      { k: 'action', label: '动作姿态', note: '重心/肢体/视线/动静', ph: '重心前倾，单手扶住栏杆，视线望向画外，衣角被风吹起', multi: true },
      { k: 'camera', label: '镜头与构图', note: '景别 + 机位 + 留白', ph: '半身景别，平视机位，画面右侧大面积留白', lib: 'shot' },
      { k: 'scene', label: '背景场景', note: '环境 + 时间 + 天气', ph: '黄昏的校园走廊，远处是橙色天空与教学楼剪影' },
      { k: 'light', label: '光影', note: '光源方向 + 阴影 + 对比', ph: '主光源来自画面左侧的柔和自然光，阴影边缘柔和；逆光形成轮廓光' },
      { k: 'color', label: '色彩调性', note: '主色 + 饱和度', ph: '冷蓝与暖橙对比，低饱和莫兰迪色调', lib: 'color' },
      { k: 'texts', label: '画面文字', note: '每个字都逐字给出', ph: '左上角竖排小字：“青春”' },
      { k: 'ratio', label: '画幅比例', note: '只写一次', ph: '9:16' },
      { k: 'quality', label: '质量与参数', note: '1–3 个即可', ph: '8K 超清，电影级人像渲染，浅景深虚化背景' },
      { k: 'negative', label: '负面排除', note: '要简洁', ph: '无文字、无水印、无UI界面、无边框' },
      { k: 'extra', label: '其他要求', note: '解析剩下的内容，也可自己写', multi: true }
    ],
    sample: {
      style: '现代日系二次元写实插画，细腻柔和的清晰线稿，平涂叠加薄涂渐变',
      subject: '银白色短发的少女，琥珀色眼睛，白皙皮肤，宁静略带忧郁的神情\n藏青色水手服上衣，白色衬衫，红色领结，单肩学生包',
      action: '重心停在台阶中段，回过身越过肩膀望向镜头，另一只手扶住栏杆',
      camera: '半身偏全身景别，平视机位，中心构图，四周留出呼吸空间',
      light: '主光源来自画面左后方的黄昏逆光，形成柔和的轮廓光；阴影边缘柔和；粉色与金色调，中低饱和',
      ratio: '9:16', negative: '无文字、无水印、无UI界面、无边框'
    }
  },
  {
    key: 'gpt25', name: 'GPT Image 2.5', badge: 'm1',
    tag: '海报 / 三视图 / 截图 / 要版式文字',
    syntax: 'spec', lang: 'zh', params: false,
    tip: '规格书写法：目的 → 画布 → 布局 → 细节 → 逐字文字 → 排版 → 风格 → 限制。这是唯一能稳定做出「能直接用的成品」的写法，画面上每个字都要逐字给出。',
    slots: [
      { k: 'purpose', label: '目的', note: '给谁用/什么场合', ph: '为青春恋爱题材动画电影制作一张竖版海报' },
      { k: 'canvas', label: '画布', note: '比例 + 色调 + 背景', ph: '竖版 9:16，柔和景深，夕阳轮廓光，粉色与金色调' },
      { k: 'layout', label: '布局', note: '元素怎么排、留白在哪', ph: '主体居中偏下，标题压在画面下三分之一，上方留出天空留白' },
      { k: 'detail', label: '主体细节', note: '逐项特征 + 材质', ph: '半身出镜的女高中生，银白色短波波头，宁静略带忧郁；藏青色水手服，红色领结', multi: true },
      { k: 'light', label: '光影与色调', note: '光源 + 阴影 + 色温', ph: '夕阳从画面右后方打来，形成柔和轮廓光；粉色与金色调，整体中低饱和' },
      { k: 'texts', label: '文本内容', note: '一行一条，会自动编号', ph: '底部中央醒目的手写风格白色标题：“在那坡道上，樱花盛开时”', multi: true },
      { k: 'typo', label: '排版', note: '字体/字号层级/颜色', ph: '主标题手写风格白色大字，副标题小号居中，底部小字上车信息' },
      { k: 'visual', label: '视觉风格', note: '媒介 + 流派 + 配色', ph: '高品质现代日本动画电影海报风格，电影级调色，细腻花瓣' },
      { k: 'ref', label: '参考图与一致性', note: '多格 / 多版本时必写', ph: '全部格子保持角色脸部、发型、配色与服装一致，看不清处保守补全' },
      { k: 'limit', label: '限制条件', note: '只允许什么/严禁什么', ph: '画面仅包含一名主要角色、一个书包、一条红丝带；严禁额外角色、Logo、水印', multi: true },
      { k: 'extra', label: '其他要求', note: '解析剩下的内容，也可自己写', multi: true }
    ],
    sample: {
      purpose: '为职业网球选手的赛后战报制作一张社交媒体图',
      canvas: '4:5 竖向体育海报，深沉的电影质感色调，背景为深黑绿色网球场，交叠的对角线几何面板与霓虹绿色点缀线条',
      layout: '球员动态抠图置于右下半部分，与文字排版重叠；姓氏横跨画面上部',
      detail: '球员处于低位双手反手击球姿势，身体前倾，球拍向右伸展\n白色遮阳帽、白色无袖上衣、宝蓝色短裙、白色护腕与带蓝色点缀的球鞋\n逼真的摄影布光，干净利落的抠图边缘',
      texts: '左上角小号名字：“ELENA”\n从画布顶部延伸至中部、超大加粗的姓氏：“RYBAKINA”\n结果标签：“def.”\n对手姓名与比分：“NAOMI OSAKA” “6-1 6-4”',
      typo: '姓氏采用超大字号、窄体、斜体、全大写、白色，带轻微粗糙体育印刷质感；名字较小并置于其上方；“def.”与比分用青柠绿色',
      visual: '高端网球转播级图形设计，高对比度，深绿/黑/白/宝蓝/青柠绿配色，细腻阴影让球员从背景与文字中凸显',
      limit: '仅保留必要的、不显眼的服装品牌标识；严禁水印、冗余说明文字、额外球员形象或边框；确保拼写与比分清晰准确'
    }
  },
  {
    key: 'banana', name: 'Nano Banana / Pro', badge: 'm3',
    tag: '改图：换装 / 换背景 / 融合',
    syntax: 'edit', lang: 'zh', params: false,
    tip: '编辑类必须「先锁身份、再写改动」。站方五大约束动词：Add / Change / Make / Remove / Replace，其中 Replace 最强。只想参考长相时，要显式写「禁止维持参考图画风与姿势」。',
    slots: [
      { k: 'ref', label: '参考图与锁定', note: '保持什么不变', ph: '参考图1的人物，保持五官、发型、服装、配饰完全一致，不要修改角色设计' },
      { k: 'verb', label: '编辑动作', note: '五大约束动词', type: 'select', options: [['replace', 'Replace 替换（最强）'], ['change', 'Change 改为'], ['add', 'Add 添加'], ['remove', 'Remove 移除'], ['make', 'Make 使…']] },
      { k: 'target', label: '要用的新元素', note: '来自哪张图 / 新内容', ph: '图1的轮子设计' },
      { k: 'change', label: '画面中被改的部分', note: '旧元素 / 位置', ph: '图2摩托车的前后轮' },
      { k: 'keep', label: '其余保持不变', note: '防止连累', ph: '其余构图、光线、背景保持不变' },
      { k: 'style', label: '风格', note: '画风 / 质感 / 光线', ph: '日系动画电影截图风格，赛璐璐平涂，暖橙色轮廓光' },
      { k: 'subject', label: '主体与外观', note: '人物 / 模型本体长什么样', ph: '二次元 3D 建模脸，真实皮肤质感，层次分明的发束' },
      { k: 'outfit', label: '服装与装备', note: '服装 / 材质 / 配件', ph: '模块化机械外骨骼装甲，黑色科技风皮革' },
      { k: 'scene', label: '场景与背景', note: '环境 / 地图 / 界面', ph: '游戏世界局内地图，可见地表纹理与植被' },
      { k: 'light', label: '光影与氛围', note: '光源 / 阴影 / 环境光', ph: '逼真光影，柔和阴影，环境光遮蔽' },
      { k: 'ratio', label: '画幅比例', note: '只写一次', ph: '16:9' },
      { k: 'texts', label: '画面文字', note: '要渲染的字逐字给出', ph: '左上角标题：“春日限定”', multi: true },
      { k: 'quality', label: '画质 / 材质与渲染', note: '清晰度 / 质感 / 颗粒', ph: '高分辨率，细节清晰，轻微胶片颗粒' },
      { k: 'extra', label: '其他要求', note: '解析剩下的内容，也可自己写', multi: true }
    ],
    sample: {
      ref: '参考图1的人物，保持五官、发型与服装完全一致，不要修改角色设计',
      verb: 'change', target: '深夜便利店门口', change: '人物身后的背景',
      keep: '人物姿态、服装、画面构图保持不变；为人物补上与便利店冷白灯光匹配的补光，并在地面加入湿润反光',
      style: '写实摄影质感，轻微胶片颗粒，冷白荧光灯与招牌霓虹的冷暖对比'
    }
  },
  {
    key: 'jimeng', name: '即梦 3.1', badge: 'm4',
    tag: '中文语境 / 国风 / 绘本',
    syntax: 'comma', lang: 'zh', params: false,
    tip: '中文逗号链：短名词短语一路逗号连接。该模型不吃 -- 参数、不吃负面词、不吃权重括号（50 条案例无一例外）。',
    slots: [
      { k: 'subject', label: '主体 + 外貌', ph: '一位穿汉服的少女，乌黑长发，琥珀色眼睛', lib: 'appearance' },
      { k: 'look', label: '外貌细节', ph: '乌黑长发，琥珀色眼睛，白皙皮肤' },
      { k: 'outfit', label: '服装', ph: '月白色交领长裙，外披薄纱', lib: 'outfit' },
      { k: 'pose', label: '动作姿态', ph: '立于石桥之上，侧身回望', lib: 'action' },
      { k: 'expression', label: '表情 / 情绪', ph: '神情安静，略带笑意' },
      { k: 'scene', label: '环境背景', ph: '雨后的江南水乡，青石板路，白墙黛瓦', lib: 'scene' },
      { k: 'light', label: '光线', ph: '黄昏的柔和侧光，水面反光', lib: 'light' },
      { k: 'color', label: '色彩', ph: '低饱和度青灰色调，点缀暖橙', lib: 'color' },
      { k: 'mood', label: '氛围', ph: '静谧，清冷，故事感', lib: 'mood' },
      { k: 'style', label: '风格媒介', ph: '写意水墨插画，工笔细节', lib: 'style' },
      { k: 'camera', label: '镜头视角', ph: '中景，平视，竖构图', lib: 'shot' },
      { k: 'ratio', label: '画幅比例', ph: '竖版 3:4', lib: 'shot' },
      { k: 'quality', label: '质量词', ph: '极致细节，超清', lib: 'quality' },
      { k: 'extra', label: '其他 / 补充', note: '解析剩下的内容，也可自己写', multi: true }
    ],
    sample: {
      subject: '一位穿汉服的少女，乌黑长发，琥珀色眼睛', outfit: '月白色交领长裙，外披薄纱',
      pose: '立于石桥之上，侧身回望', scene: '雨后的江南水乡，青石板路，白墙黛瓦',
      light: '黄昏的柔和侧光，水面反光', color: '低饱和度青灰色调，点缀暖橙',
      mood: '静谧，清冷，故事感', style: '写意水墨插画，工笔细节'
    }
  }
];
const modelByKey = (k) => MODELS.filter((m) => m.key === k)[0];
/* 案例数据（data.js）里的模型名与生成器的模型名不完全一致，这里补齐映射，
   否则「以它为基础」遇到 GPT Image 2.5 / Banana / 即梦 的案例会认不出模型 */
const MODEL_ALIAS = {
  'Niji 7': 'niji7', 'GPT Image-2': 'gpt2', 'GPT Image 2.5 Sunburst': 'gpt25',
  'Banana Pro/Banana 2': 'banana', 'banana-pro-banana-2': 'banana', 'jimeng-3_1': 'jimeng',
  'GPT Image 2.5': 'gpt25', 'Nano Banana / Pro': 'banana', '即梦 3.1': 'jimeng'
};
const modelByName = (n) => MODELS.filter((m) => m.key === n || m.name === n)[0] || modelByKey(MODEL_ALIAS[n] || '');
const BADGE_OF = { 'Niji 7': 'm2', 'GPT Image-2': 'm0', 'GPT Image 2.5 Sunburst': 'm1', 'Banana Pro/Banana 2': 'm3', 'banana-pro-banana-2': 'm3', 'jimeng-3_1': 'm4' };

/* ============================================================
   2. 词库（来自词频统计：构图244 / 光影194 / 插画191 …）
   ============================================================ */
const LIB = {
  style: { zh: '画风', en: 'Style', zhv: ['现代日系动画', '新海诚风格', '赛璐璐平涂', '厚涂插画', '半厚涂', '水彩插画', '水墨工笔', '绘本插画', '像素画', 'Q版', '3D渲染', '写实摄影', '电影质感', '复古胶片', '概念设定稿', '贴纸设计', '版画', '油画', '定格动画', '儿童插画'], env: ['official anime key visual', 'character design sheet', 'sticker design', 'Makoto Shinkai style', 'cel shading', 'watercolor illustration', 'ink wash painting', 'pixel art', 'chibi style', '3D render', 'cinematic film still', 'retro film photography', "children's book illustration", 'concept art', 'lineart only', 'dark fantasy illustration', 'slice-of-life anime'] },
  appearance: { zh: '外貌', en: 'Features', zhv: ['银白色短发', '黑色长直发', '高马尾', '麻花辫', '蓬松刘海', '琥珀色眼睛', '大而明亮的眼睛', '白皙皮肤', '淡淡的雀斑', '宁静的神情', '温柔微笑'], env: ['silver-white short bob hair', 'long black straight hair', 'high ponytail', 'fluffy bangs', 'amber eyes', 'large sparkling blue eyes', 'fair skin with soft blush', 'freckles', 'calm expression', 'gentle smile'] },
  outfit: { zh: '服装', en: 'Outfit', zhv: ['水手服', '藏青色制服', '白色衬衫', '红色领结', '黑色西装外套', '宽松牛仔外套', '连帽卫衣', '长款大衣', '蕾丝洋装', '金属护甲', '斗篷', '运动服', '汉服长裙', '针织毛衣'], env: ['navy sailor school uniform', 'white shirt', 'red ribbon', 'long dark coat', 'oversized denim jacket', 'hoodie', 'lace dress', 'metal armor', 'cloak', 'sportswear', 'knitted sweater'] },
  action: { zh: '动作', en: 'Action', zhv: ['站在台阶上回头', '坐在窗边看书', '奔跑', '跳过水洼', '撑伞行走', '单手托腮', '双手插兜', '抬头仰望', '低头沉思', '张开双臂', '回望镜头', '被风吹起衣角'], env: ['looking back over shoulder', 'sitting by the window reading', 'running', 'jumping over a puddle', 'walking with an umbrella', 'resting chin on hand', 'hands in pockets', 'looking up at the sky', 'arms open', 'clothes blown by the wind'] },
  shot: { zh: '景别构图', en: 'Shot / Comp', zhv: ['特写', '近景', '半身', '中景', '全身', '远景', '中心构图', '三分法', '对称构图', '对角线构图', '大面积留白', '前景遮挡'], env: ['close-up', 'medium close-up', 'upper body', 'medium shot', 'full body', 'wide shot', 'centered composition', 'rule of thirds', 'symmetrical composition', 'diagonal composition', 'large negative space', 'foreground occlusion'] },
  angle: { zh: '机位视角', en: 'Angle', zhv: ['平视', '低角度仰拍', '高角度俯拍', '鱼眼', '长焦压缩', '广角', '微距'], env: ['eye-level', 'low angle', 'high angle', 'fisheye', 'telephoto compression', 'wide angle', 'macro'] },
  light: { zh: '光线', en: 'Lighting', zhv: ['柔和自然光', '逆光', '轮廓光', '硬光', '体积光', '丁达尔效应', '镜头光晕', '黄昏金色时刻', '蓝调时刻', '霓虹灯光', '窗边侧光', '三点式布光', '烛光', '冷白荧光灯'], env: ['soft natural light', 'backlight', 'rim light', 'hard light', 'volumetric light', 'god rays', 'lens flare', 'golden hour', 'blue hour', 'neon lights', 'window side light', 'three-point lighting', 'candle light', 'cool fluorescent light'] },
  color: { zh: '色彩', en: 'Color', zhv: ['低饱和', '高饱和', '冷暖对比', '莫兰迪色', '单色调', '撞色', '蓝金色调', '粉紫色调', '暗黑墨绿', '米白暖调', '黑白'], env: ['low saturation', 'vivid colors', 'warm-cool contrast', 'Morandi palette', 'monochrome', 'muted colors', 'blue and gold palette', 'pink and purple palette'] },
  material: { zh: '材质', en: 'Material', zhv: ['丝绸质感', '亮面漆器', '哑光PVC', '毛绒质感', '金属反光', '玻璃透光', '陶瓷釉面', '粗糙岩石', '水彩纸纹理', '老旧纸张'], env: ['silk texture', 'glossy lacquer', 'matte PVC', 'fluffy fur', 'metallic reflection', 'translucent glass', 'ceramic glaze', 'rough stone', 'watercolor paper texture'] },
  mood: { zh: '情绪氛围', en: 'Mood', zhv: ['治愈', '清冷', '慵懒', '神秘', '怀旧', '孤独', '温暖', '梦幻', '压抑', '史诗感', '日常感', '节日气氛'], env: ['healing', 'aloof and cool', 'languid', 'mysterious', 'nostalgic', 'lonely', 'warm', 'dreamy', 'melancholic', 'epic', 'everyday life', 'festive'] },
  scene: { zh: '场景环境', en: 'Scene', zhv: ['纯白背景', '纯色背景', '樱花台阶', '雨夜街道', '便利店门口', '放学后的教室', '天台', '海边灯塔', '森林小径', '废墟都市', '太空舱内', '老式咖啡馆', '雪原', '沙漠公路', '图书馆', '神社'], env: ['white background', 'plain background', 'cherry blossom steps', 'rainy neon street', 'convenience store entrance', 'empty classroom', 'rooftop', 'seaside lighthouse', 'forest path', 'ruined city', 'old cafe', 'snowy field', 'desert highway', 'library', 'shrine', 'night alley'] },
  element: { zh: '点缀元素', en: 'Elements', zhv: ['飘落的樱花', '飞舞的花瓣', '雨滴', '光斑', '纸张碎片', '漂浮的尘埃', '飞翔的鸟群', '漂浮的几何图形', '手绘涂鸦', '星星闪光'], env: ['falling cherry blossom petals', 'drifting petals', 'raindrops', 'light bokeh', 'paper scraps', 'floating dust', 'flying birds', 'floating geometric shapes', 'hand-drawn doodles', 'sparkles'] },
  quality: { zh: '质量词', en: 'Quality', zhv: ['细腻', '8k', '高细节', '电影级质感', '干净线稿', '柔和高光', '轻微胶片颗粒', '真实皮肤质感'], env: ['highly detailed', '8k', 'cinematic', 'clean lineart', 'soft highlights', 'subtle film grain', 'realistic skin texture'] },
  layout: { zh: '版式比例', en: 'Layout', zhv: ['竖版海报 9:16', '竖版 4:5', '方形 1:1', '横版 16:9', '左右分屏', '上下分格', '页面截图', '三视图平行排开', '4×4 网格'], env: [] },
  edit: { zh: '编辑约束', en: 'Edit', zhv: ['保持人物不变', '保持服装不变', '保持发型五官一致', '只改变背景', '融合两张参考图', '替换元素', '移除多余物体', '保持构图不变'], env: ['keep the character unchanged', 'keep the outfit unchanged', 'keep the composition unchanged', 'only change the background', 'blend two reference images'] }
};
const LIB_ORDER = ['style', 'appearance', 'outfit', 'action', 'shot', 'angle', 'light', 'color', 'material', 'mood', 'scene', 'element', 'quality', 'layout', 'edit'];

/* ============================================================
   3. 模板（来自《写作教程》）
   ============================================================ */
const TEMPLATES = [
  { name: 'A · Niji 7 动漫立绘', model: 'Niji 7', desc: '标签流；白底全身立绘 / 贴纸 / 设定稿', body: `【画风/体裁: official anime key visual / character design sheet / sticker design】,
【主体: 1 girl, 年龄, 发色+发型, 瞳色, 表情】,
【服装: 分件写，注意层级】,
【姿态: standing / dynamic pose / 具体动作】,
full body, 【机位: eye-level / low angle】, centered composition,
white background, 【点缀元素】,
【光线: soft lighting / rim light】,
clean lineart, cel shading, vibrant colors
--niji 7 --stylize 200 --no text, watermark, blur, bad hands` },
  { name: 'B · Niji 7 氛围场景', model: 'Niji 7', desc: '英文长句 + --raw，适合叙事型插画', body: `【风格声明: cinematic anime illustration, painterly】,
【主体 + 一个定格瞬间: A lonely, worn-out black cat plush sitting on top of an old clothing donation box…】,
【物件细节: faded fur, loose seams, dusty fabric】,
【环境: empty residential street, telephone poles, weeds through cracked pavement】,
【光线与情绪: soft evening light, bittersweet nostalgia, subtle depth of field】,
photorealistic textures, Japanese slice-of-life film aesthetic
--niji 7 --raw --stylize 250` },
  { name: 'C · GPT Image-2 槽位说明书', model: 'GPT Image-2', desc: '中文分点体，逐槽位不漏项', body: `画风总纲：【现代日系二次元写实插画，细腻柔和的清晰线稿，平涂叠加薄涂渐变】
主体：【外貌 4 项 + 服装分件】
动作姿态：重心【】；肢体【】；视线【】；动静感【】
镜头与构图：【景别 + 机位 + 画面平衡 + 留白】
光影色彩：主光源【方向/性质】；阴影边缘【】；色彩【色调 + 饱和度 + 对比】
画幅比例：【9:16】
负面排除：【无文字、无水印、无UI界面、无边框】` },
  { name: 'D · GPT Image 2.5 规格书', model: 'GPT Image 2.5', desc: '海报 / 设定图 / 截图，唯一能稳定出成品的写法', body: `目的：【给谁用、什么场合、要致敬什么】

画布：【比例 + 色调 + 背景构成】

布局：【元素怎么排；主视觉在哪个区位；留白在哪】

主体细节：【逐项特征 + 材质 + 状态】

文本内容：准确使用以下 N 个可见文本元素：
1) 【位置】：“【逐字内容】”
2) 【位置】：“【逐字内容】”

排版：【字体风格 + 字号层级 + 颜色；谁大谁小】

视觉风格：【媒介 + 工艺 + 参考流派 + 配色方案】

限制条件：【只允许出现什么；严禁出现什么】` },
  { name: 'E · Banana 编辑指令', model: 'Nano Banana / Pro', desc: '锁身份 + 换其余；Replace 最强', body: `参考【图1/上传的角色图片】，保持【发型、五官、服装、配饰、配色】完全一致，不要修改角色设计。
把【要改的元素】替换为【新内容】；【画面其余部分如何变化】。
风格：【画风/质感/光线】。

（只想参考长相时必须显式解绑：）
禁止维持参考图画风，禁止保持参考图角色姿势，参考图只是告诉你角色长什么样，你要完全重新设计。` },
  { name: 'F · 即梦 3.1 中文逗号链', model: '即梦 3.1', desc: '短名词短语 + 全逗号；无参数无负面词', body: `【主体+外貌】，【服装分件】，【动作姿态】，【环境背景】，【光线】，【色彩】，【氛围】，【风格媒介】` },
  { name: 'G · 三视图 / 精灵表 / 表情表', model: 'GPT Image 2.5', desc: '行列数 + 逐格内容 + 一致性条款，三件缺一不可', body: `制作一张【4×4】的【舞蹈姿势表】，使用参考图中的角色，在【正方形】画面里放置恰好【16】个大小完全一致的分格，背景【纯白】。

角色一致性：在全部分格中，必须保持以下特征一致：【脸部/发型/配色/身体比例/服装/配饰/原本的美术风格】。不要重新设计角色。
如参考图中某些细节看不清，请保守补全，并确保这些补全在全部格子里保持一致。

分格内容：按【从左到右、从上到下】的顺序，依次为【逐格列出】……` },
  { name: 'H · 海报文字排版', model: 'GPT Image 2.5', desc: '文字逐字给出 + 排版层级', body: `【比例】海报，【底色/背景构成】。
主体：【人物/产品 + 姿态 + 位置】。
文字（逐字给出）：
- 左上角小号：【英文/中文文案】
- 画面主标题（超大、加粗、窄体、全大写）：【文案】
- 底部小字：【文案】
排版：【谁大谁小、颜色、是否手写体/印刷体】。
配色：【主色 + 辅色】。
限制：不包含任何文字（除上述 N 处）、标志、水印、边框。` }
];

/* ============================================================
   4. 速查手册数据
   ============================================================ */
const REF_PARAMS = [
  ['--niji 7', '—', '必带；166 条案例中 155 条带它，其中 90 条只带它一个'],
  ['--stylize / --s', '0–1000', '0–200 收敛忠实；200–600 最佳；800+ 装饰过度、轮廓失准；新手 200'],
  ['--chaos / --c', '0–100', '0–10 四张高度一致；50+ 差异大；常用 15–30（案例中位数 20）'],
  ['--raw', '—', '关自动美颜，严格遵循提示词；线稿 / 三视图 / 设定稿时开'],
  ['--no', '—', '常带 --no text, watermark, blur, bad hands；纯线稿 --no shading；白底 --no background'],
  ['--sref', '风格码', '写法 --sref 3397777607；多码空格分隔（2–3 个为宜，比例固定 50/50）'],
  ['--sw', '0–1000', '风格强度：100–300 轻量；500–700 最实用；800–1000 强锁（提示词只管主体构图）'],
  ['--weird / --w', '0–3000', '少量尝试，常用 4'],
  ['--ar', '—', 'Niji 7 用不上，全库 0 条使用'],
  ['--style raw', '—', '写成 --styleraw 不生效；每个后缀前后都要有空格']
];
const REF_DICT = [
  ['画风', 'cel shading / impasto / watercolor / ink wash / lineart / pixel art / chibi'],
  ['媒介', 'digital painting / oil painting / concept art / sticker design'],
  ['文学性', 'Makoto Shinkai style / retro cinematic / monochrome manga'],
  ['镜头', 'close-up / medium close-up / upper body / medium shot / full body / wide shot'],
  ['机位', 'eye-level / low angle / high angle / fisheye / telephoto'],
  ['构图', 'centered / rule of thirds / symmetrical / negative space / diagonal'],
  ['景深', 'shallow depth of field / bokeh background'],
  ['光线', 'backlight / rim light / soft light / hard light / volumetric light / lens flare / god rays'],
  ['色彩', 'low saturation / vivid / warm-cool contrast / Morandi palette / clashing colors'],
  ['材质', 'satin / lacquerware / matte PVC / jelly-like / paper texture'],
  ['情绪', 'healing / aloof and cool / languid / mysterious / nostalgic'],
  ['编辑动作', 'keep / replace / blend / remove / change into']
];
const REF_FIX = [
  ['主体不像', '外貌只写了"可爱"', '补 3–5 项可画特征（发色发型 / 瞳色 / 肤色 / 表情 / 服装分件）'],
  ['画面平、像素材图', '缺光线描述', '加"主光源方向 + 阴影边缘 + 色彩对比"三件套'],
  ['没有视觉重点', '缺景别与景深', '加 close-up / 半身、浅景深、背景虚化'],
  ['画面太满太乱', '没给留白指令', '加大面积留白 / 纯色背景 / 简化背景'],
  ['画风不对味', '风格词只给了"动漫"', '换成工艺级词，或直接引导演 / 游戏风格'],
  ['文字全是乱码', '没给逐字内容', '逐字写出文案 + 位置 + 字体风格'],
  ['角色每格长得不一样', '多格没写一致性条款', '加"全部格子保持脸部 / 发型 / 配色 / 服装一致"并规定看不清处保守补全'],
  ['参考图把画风也带过去了', '没显式解绑', '加"禁止维持参考图画风 / 姿势，参考图只提供长相"'],
  ['改图时连不该改的也改了', '没写"保持"', '显式列出"保持 X、Y、Z 不变"'],
  ['人物比例 / 大小失控', '没标尺度', '写"身形仅占画面约 2.5%"这类明确百分比'],
  ['想出透明底却给了白底', '写成了条件句', '改成硬性要求"必须输出透明背景"'],
  ['一样的人越画越不像', '每张都重写描述', 'Niji 7 用同一组 --sref + 固定外形描述；其他模型用同一张参考图'],
  ['词写了没反应', '被后面的词淹没或冲突', '精简到 1–3 个质量词；删掉互斥风格；关键约束放前面或单独成行'],
  ['中英混排效果怪', '词粘在一起', '补分隔符 / 空格']
];
const REF_CHECK = [
  '交付物（用途 + 比例）写了吗？',
  '主体有没有 3 项以上可画特征？',
  '风格词是工艺级（平涂/厚涂/水彩/线稿/3D 渲染）而不是「好看」？',
  '镜头（景别 + 机位 + 构图法）写了吗？',
  '光线有方向 + 有性质（硬/柔/逆光）吗？',
  '色彩写了色调 + 饱和度吗？',
  '材质写了至少一处吗？',
  '质量词是否 ≤3 个？',
  '所有相邻词都有分隔符吗？',
  '比例只出现一次吗？',
  '画面文字是否逐字给出（含位置与字体）？',
  '限制条件（不要什么）写了吗？',
  '用参考图时，「保持什么 / 改变什么」是否分开写清？',
  '多格图是否写了一致性条款 + 每格内容？',
  '需要「小主体」时有没有标百分比？',
  '风格词之间是否互相冲突？',
  'Niji 7 是否只带了必要参数（--niji 7 ± --stylize/--raw/--sref）？',
  '有没有误写 --styleraw、--ar？',
  '是否只改了一处就重新出图？',
  '出片成功后，有没有把提示词存成带变量的模板？'
];

/* ============================================================
   5. 状态
   ============================================================ */
const LS_KEY = 'krene.studio.v1';
const state = {
  model: 'niji7',
  slots: {},           // { modelKey: { slotKey: value } }
  verb: 'change',
  params: { stylizeOn: true, stylize: 200, chaosOn: false, chaos: 20, raw: false, srefOn: false, sref: '', sw: 600, weirdOn: false, weird: 4, no: 'text, watermark, blur, bad hands' },
  favs: [],            // 我的词条：[{ title, text, model, at }]
  history: [],         // 生成历史：[{ at, model, mk, text, slots, params }]
  custom: {},          // 自定义槽位：{ modelKey: [{ k, label }] }
  libTab: 'style',
  mineQ: '',
  histQ: '',
  locked: false
};
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.model && modelByKey(d.model)) state.model = d.model;
    if (d.slots) state.slots = d.slots;
    if (d.params) Object.assign(state.params, d.params);
    if (Array.isArray(d.favs)) state.favs = d.favs;
    if (Array.isArray(d.history)) state.history = d.history;
    if (d.custom) state.custom = d.custom;
  } catch (e) { /* ignore */ }
}
function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      model: state.model, slots: state.slots, params: state.params,
      favs: state.favs, history: state.history, custom: state.custom
    }));
  } catch (e) { /* ignore */ }
}
/* 内置槽位 + 用户自定义槽位（顺序：内置在前，自定义追加在后） */
function slotsOf(m) {
  const c = (state.custom && state.custom[m.key]) || [];
  return m.slots.concat(c.map((x) => ({ k: x.k, label: x.label, note: '自定义', ph: '', multi: true, custom: true })));
}
function slotVal(mk, sk) {
  const m = modelByKey(mk); const def = m.slots.filter((s) => s.k === sk)[0];
  if (!state.slots[mk]) state.slots[mk] = {};
  let v = state.slots[mk][sk];
  if (v == null && def && def.type === 'select') v = 'change';
  return v == null ? '' : v;
}
function setSlot(mk, sk, v) { if (!state.slots[mk]) state.slots[mk] = {}; state.slots[mk][sk] = v; }

/* ============================================================
   6. 生成成品提示词
   ============================================================ */
function buildNiji(m, params) {
  const parts = slotsOf(m).map((s) => slotVal(m.key, s.k).trim()).filter(Boolean)
    .map((v) => v.replace(/\s*\n\s*/g, ', ').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim())
    .filter(Boolean);
  let suffix = '--niji 7';
  const p = params;
  if (p.stylizeOn) suffix += ' --stylize ' + p.stylize;
  if (p.chaosOn) suffix += ' --chaos ' + p.chaos;
  if (p.raw) suffix += ' --raw';
  if (p.srefOn && p.sref.trim()) suffix += ' --sref ' + p.sref.trim() + ' --sw ' + p.sw;
  if (p.weirdOn) suffix += ' --weird ' + p.weird;
  if (p.no && p.no.trim()) suffix += ' --no ' + p.no.trim();
  return parts.join(', ') + '\n' + suffix;
}
function buildLines(m) {
  const out = [];
  slotsOf(m).forEach((s) => {
    const v = slotVal(m.key, s.k).trim();
    if (!v) return;
    const lines = v.split('\n').map((x) => x.trim()).filter(Boolean);
    if (s.multi && lines.length > 1) out.push(s.label + '：\n' + lines.map((x) => '- ' + x).join('\n'));
    else out.push(s.label + '：' + lines.join(' '));
  });
  return out.join('\n');
}
function buildSpec(m) {
  const out = [];
  slotsOf(m).forEach((s) => {
    const v = slotVal(m.key, s.k).trim();
    if (!v) return;
    if (s.k === 'texts') {
      const ts = v.split('\n').map((x) => x.trim()).filter(Boolean);
      out.push('文本内容：准确使用以下 ' + ts.length + ' 个可见文本元素：\n' + ts.map((t, i) => (i + 1) + ') ' + t).join('\n'));
      return;
    }
    if (s.k === 'detail') { out.push(s.label + '：' + v.split('\n').map((x) => x.trim()).filter(Boolean).join('\n')); return; }
    const lines = v.split('\n').map((x) => x.trim()).filter(Boolean);
    if (s.multi && lines.length > 1) out.push(s.label + '：\n' + lines.map((x) => '- ' + x).join('\n'));
    else out.push(s.label + '：' + lines.join(' '));
  });
  return out.join('\n\n');
}
const VERB_TEXT = {
  replace: (t, c) => '把' + (c || '画面中的元素') + '替换为' + (t || '新元素'),
  change: (t, c) => '把' + (c || '画面中的元素') + '改为' + (t || '新内容'),
  add: (t, c) => '在' + (c || '画面中') + '添加' + (t || '新元素'),
  remove: (t, c) => '移除' + (c || '画面中的元素') + (t ? '，改用' + t : ''),
  make: (t, c) => '使' + (c || '画面') + '呈现' + (t || '新的效果')
};
function buildEdit(m) {
  const g = (k) => slotVal(m.key, k).trim();
  const out = [];
  if (g('ref')) out.push(g('ref') + '。');
  const verb = slotVal(m.key, 'verb') || 'change';
  const target = g('target'), change = g('change');
  if (target || change) out.push('请' + VERB_TEXT[verb](target, change) + '。');
  if (g('keep')) out.push(g('keep') + '。');
  if (g('style')) out.push('风格：' + g('style') + '。');
  if (g('quality')) out.push('画质与细节：' + g('quality') + '。');
  if (g('extra')) out.push(g('extra') + '。');
  (slotsOf(m).filter((s) => s.custom) || []).forEach((s) => {
    const v = slotVal(m.key, s.k).trim();
    if (v) out.push(s.label + '：' + v.replace(/\s*\n\s*/g, ' ') + '。');
  });
  return out.join('\n');
}
function buildComma(m) {
  return slotsOf(m).map((s) => slotVal(m.key, s.k).trim()).filter(Boolean)
    .map((v) => v.replace(/\s*\n\s*/g, '，').replace(/，+/g, '，').replace(/^，|，$/g, ''))
    .join('，');
}
function buildOutput() {
  const m = modelByKey(state.model);
  if (m.syntax === 'tags') return buildNiji(m, state.params).trim();
  if (m.syntax === 'lines') return buildLines(m).trim();
  if (m.syntax === 'spec') return buildSpec(m).trim();
  if (m.syntax === 'edit') return buildEdit(m).trim();
  if (m.syntax === 'comma') return buildComma(m).trim();
  return '';
}

/* ============================================================
   6.5 反向解析：把一段现成提示词拆回槽位
   （标签命中优先，其次按词义打分归类，兜底进「其他」）
   ============================================================ */
const BUCKET_SLOTS = {
  ref: ['ref', 'keep'], keep: ['keep', 'ref'], ratio: ['ratio', 'canvas'],
  texts: ['texts', 'extra'], typo: ['typo', 'extra'],
  light: ['light', 'visual', 'color', 'detail'], color: ['color', 'light', 'detail'],
  camera: ['camera', 'detail'],
  pose: ['pose', 'action', 'detail'], expression: ['expression', 'mood', 'look', 'subject'],
  outfit: ['outfit', 'detail', 'subject'], accessories: ['accessories', 'outfit', 'detail', 'subject'],
  look: ['look', 'subject', 'detail'], props: ['props', 'element', 'detail'],
  scene: ['scene', 'canvas', 'detail'], mood: ['mood', 'detail', 'expression'],
  quality: ['quality', 'limit', 'render', 'detail'], style: ['style', 'genre', 'visual', 'detail']
};
const LABEL_ALIAS = {
  '画风': ['style', 'genre', 'visual'], '画风总纲': ['style', 'genre', 'visual'], '整体画风': ['style', 'genre', 'visual'],
  '风格': ['style', 'genre', 'visual'], '艺术风格': ['style', 'genre', 'visual'], '媒介': ['style', 'genre', 'visual'],
  'style': ['style', 'genre', 'visual'], 'art style': ['style', 'genre', 'visual'], 'medium': ['style', 'genre', 'visual'],
  '视觉风格': ['visual', 'style', 'genre'], '画面风格': ['visual', 'style', 'genre'],
  '参考图': ['ref', 'keep'], '参考图与一致性': ['ref', 'keep'], '参考图片': ['ref', 'keep'], '一致性': ['ref', 'keep'], 'reference': ['ref', 'keep'],
  '保持': ['keep', 'ref'], '保持不变': ['keep', 'ref'], '其余保持不变': ['keep', 'ref'], 'keep': ['keep', 'ref'],
  '主体': ['subject', 'detail'], '主体细节': ['subject', 'detail'], '角色': ['subject', 'detail'], '人物': ['subject', 'detail'],
  '主体与外观': ['subject', 'look'], '对象': ['subject', 'detail'], '内容': ['subject', 'detail'], 'subject': ['subject', 'detail'], 'character': ['subject', 'detail'],
  '外貌': ['look', 'subject'], '外貌细节': ['look', 'subject'], '特征': ['look', 'subject'], '长相': ['look', 'subject'],
  '五官': ['look', 'subject'], '发型': ['look', 'subject'], 'appearance': ['look', 'subject'], 'look': ['look', 'subject'],
  '表情': ['expression', 'mood', 'look'], '神情': ['expression', 'mood', 'look'], 'expression': ['expression', 'mood', 'look'],
  '情绪': ['mood', 'expression'], '氛围': ['mood'], '氛围感': ['mood'], '气质': ['mood'], 'mood': ['mood'], 'atmosphere': ['mood'],
  '服装': ['outfit'], '服装配饰': ['outfit'], '服装与装备': ['outfit'], '穿着': ['outfit'], '服饰': ['outfit'], '衣物': ['outfit'],
  'outfit': ['outfit'], 'clothing': ['outfit'], '装备': ['outfit', 'props'],
  '配饰': ['accessories', 'outfit'], '饰品': ['accessories', 'outfit'], '配件': ['accessories', 'outfit'],
  '动作': ['pose', 'action'], '动作姿态': ['pose', 'action'], '姿态': ['pose', 'action'], '姿势': ['pose', 'action'],
  'pose': ['pose', 'action'], 'action': ['pose', 'action'],
  '道具': ['props', 'element'], '手持': ['props', 'element'], '物件': ['props', 'element'], 'props': ['props', 'element'],
  '镜头': ['camera'], '镜头与构图': ['camera'], '镜头视角': ['camera'], '机位': ['camera'], '构图': ['camera'],
  '景别': ['camera'], '视角': ['camera'], '拍摄': ['camera'], 'shot': ['camera'], 'camera': ['camera'], 'composition': ['camera'],
  '背景': ['scene', 'canvas'], '背景场景': ['scene', 'canvas'], '环境': ['scene', 'canvas'], '环境背景': ['scene', 'canvas'],
  '场景': ['scene', 'canvas'], '场景与背景': ['scene', 'canvas'], '地点': ['scene', 'canvas'], 'scene': ['scene', 'canvas'], 'background': ['scene', 'canvas'],
  '光影': ['light'], '光影色彩': ['light'], '光影与色调': ['light'], '光影与氛围': ['light'], '光线': ['light'], '打光': ['light'],
  '照明': ['light'], 'light': ['light'], 'lighting': ['light'],
  '色彩': ['color', 'light'], '色彩调性': ['color', 'light'], '配色': ['color', 'light'], '色调': ['color', 'light'],
  'color': ['color', 'light'], 'palette': ['color', 'light'],
  '质量': ['quality', 'limit'], '质量词': ['quality', 'limit'], '质量与参数': ['quality', 'limit'], '画质': ['quality', 'limit'],
  '画质与细节': ['quality', 'limit'], '画质 / 材质与渲染': ['quality', 'limit'], '材质': ['quality', 'limit'], '渲染': ['quality', 'limit'],
  'quality': ['quality', 'limit'],
  '文本内容': ['texts'], '文字': ['texts'], '画面文字': ['texts'], '标语': ['texts'], '标题': ['texts'], 'text': ['texts'], 'texts': ['texts'],
  '排版': ['typo', 'extra'], '字体': ['typo', 'extra'], '字号': ['typo', 'extra'], 'typography': ['typo', 'extra'],
  '画幅比例': ['ratio', 'canvas'], '比例': ['ratio', 'canvas'], '画幅': ['ratio', 'canvas'], '尺寸': ['ratio', 'canvas'],
  '纵横比': ['ratio', 'canvas'], 'aspect': ['ratio', 'canvas'], 'ratio': ['ratio', 'canvas'],
  '画布': ['canvas', 'ratio'], 'canvas': ['canvas', 'ratio'],
  '布局': ['layout'], '位置': ['layout'], 'layout': ['layout'],
  '目的': ['purpose'], '用途': ['purpose'], '场合': ['purpose'], 'purpose': ['purpose'],
  '负面排除': ['negative', 'limit'], '负面': ['negative', 'limit'], '排除': ['negative', 'limit'],
  '禁止': ['negative', 'limit'], '不要': ['negative', 'limit'], 'negative': ['negative', 'limit'],
  '限制条件': ['limit', 'negative'], '限制': ['limit', 'negative'], '约束': ['limit', 'negative'],
  'constraint': ['limit', 'negative'], 'limit': ['limit', 'negative'],
  '编辑动作': ['verb'], '动作动词': ['verb'], 'verb': ['verb'],
  '新元素': ['target'], '要用的新元素': ['target'], 'target': ['target'],
  '被改的部分': ['change'], '画面中被改的部分': ['change'], '原元素': ['change'],
  '其他': ['extra'], '其他要求': ['extra'], '补充': ['extra'], '额外': ['extra'], '备注': ['extra'], 'extra': ['extra'], 'other': ['extra']
};
const PARSE_HINTS = [
  ['ref', /(参考图|参考图片|参考|参照|上传的图|上传的角色|原图|图一|图二|图1|图2|第1张|第2张|reference|參考圖|參考|原圖)/i],
  ['keep', /(保持|保持不变|不变|一致|不要修改|严禁改变|维持|保留|不變|維持|keep|unchanged|consisten)/i],
  ['ratio', /\d{1,2}\s*[:：]\s*\d{1,2}|竖版|横版|竖构图|横构图|方图|正方形|比例|画幅|尺寸|寬高比|宽高比|aspect/i],
  ['texts', /(逐字|文字|标语|标题|字幕|台词|文案|logo|“|”|「|」|標語|標題|字幕|台詞)/],
  ['typo', /(字体|字号|排版|版式|加粗|斜体|窄体|全大写|居中|杂志感|卡片式|handwritten|serif|sans|bold|italic|字體|雜誌|卡片)/i],
  ['light', /(光线|光影|逆光|侧光|顺光|柔光|硬光|打光|照明|轮廓光|高光|阴影|光晕|丁达尔|光斑|光洒|自然光|灯光|light|lighting|glow|rim ?light|shadow|backlit|光線|陰影|輪廓光|燈光)/i],
  ['color', /(色调|色彩|配色|饱和度|低饱和|高饱和|冷色|暖色|冷暖|莫兰迪|克莱因蓝|青灰|撞色|渐变|色系|palette|pastel|vibrant|saturat|monochrom|色調|飽和|冷調|暖調)/i],
  ['camera', /(构图|镜头|机位|视角|景别|特写|近景|中景|半身|全身|全景|俯视|仰视|平视|俯拍|仰拍|广角|鱼眼|留白|三分|对称|对角线|景深|虚化|焦距|三视图|正视图|侧视图|背视图|四视图|设定图|设定稿|精灵表|精灵图|表情表|姿势表|分镜|分格|拼版|网格|\d+\s*mm|shot|camera|composition|framing|angle|portrait|full[- ]?body|close[- ]?up|bokeh|全身|上半身|バストアップ|立ち絵|構図|アングル|俯瞰|煽り|三視圖|正視圖|側視圖|背視圖|設定圖|精靈表)/i],
  ['pose', /(站|坐|躺|跪|蹲|跑|走|跳|回望|望向|低头|抬头|转身|伸手|双手|单手|抱|举|扶|倚|撑|抬起|姿态|动作|pose|standing|sitting|lying|looking|holding|walking|leaning|立ち|座り|歩|振り向|見上げ|見下ろし|姿態|動作)/i],
  ['expression', /(表情|神情|眼神|微笑|笑容|笑|哭|流泪|皱眉|怒|惊|闭眼|眨眼|smile|expression|frown|tears|笑顔|涙|目線|流淚)/i],
  ['outfit', /(服|裙|衣|裤|裤|袜|鞋|靴|帽|领|袖|手套|围巾|制服|汉服|和服|校服|西装|外套|斗篷|披风|铠甲|uniform|dress|skirt|shirt|coat|hat|shoes|socks|jacket|kimono|制服|着物|浴衣|セーラー|ワンピース|コート|帽子|褲|襪|領|圍巾|披風|鎧甲|服裝|服飾)/i],
  ['accessories', /(配饰|饰品|项链|耳环|戒指|眼镜|发饰|蝴蝶结|领结|项圈|accessor|necklace|earring|glasses|bow|眼鏡|ヘヤピン|リボン|配飾|項鍊|耳環|髮飾|蝴蝶結|領結)/i],
  ['look', /(发|瞳|眼|肤|五官|脸|身材|长发|短发|双马尾|刘海|马尾|辫|白皙|hair|eyes|skin|face|bob|髪|瞳|肌|顔|ヘア|ツインテール|前髪|髮|膚|臉|長髮|短髮|瀏海|髮型|皮膚)/i],
  ['props', /(手持|拿着|握着|举着|捧着|背着|道具|伞|包|书|花束|杯子|瓶|剑|刀|相机|吉他|魔杖|气球|手机|prop|umbrella|sword|katana|gun|rifle|book|bag|剣|刀|傘|本|拿|書|劍|相機|氣球|手機)/i],
  ['scene', /(背景|环境|场景|天空|街道|室内|室外|教室|走廊|屋顶|海边|沙滩|森林|山|水|雨|雪|樱花|夜晚|黄昏|清晨|便利店|水乡|房间|background|scene|indoors|outdoors|street|room|sky|forest|beach|snow|rain|空|街|部屋|海|森|夜|桜|場景|環境|室內|室外|屋頂|海邊|沙灘|櫻花|黃昏|房間)/i],
  ['mood', /(氛围|氛围感|气质|梦幻|治愈|清冷|神秘|慵懒|静谧|电影感|故事感|高级感|宿命|压抑|温暖|温柔|清新|mood|atmosphere|dreamy|cinematic|serene|nostalgic|氛圍|氣質|夢幻|治癒|神秘|靜謐|電影感|故事感|高級感|溫柔)/i],
  ['quality', /(8k|4k|超清|超高清|高清|极致细节|细节丰富|细腻|精致|杰作|大师|完美|清晰|干净|clean|lineart|detailed|sharp|texture|best quality|masterpiece|highres|ultra[- ]?detailed|render|材质|渲染|质感|纹理|反射|建模|pbr|normal map|roughness|metallic|ambient occlusion|subsurface|specular|global illumination|hard[- ]?surface|高画質|最高画質|精細|ディテール|高解像度|高品質|高解析|細節|質感|筆觸|線條|乾淨|精緻|傑作|渲染|材質|紋理|高畫質)/i],
  ['style', /(画风|风格|插画|厚涂|平涂|赛璐璐|水彩|水墨|油画|丙烯|工笔|写意|像素|3d|二次元|日系|国风|古风|浮世绘|新海诚|wlop|illustration|anime style|cel shading|watercolor|impasto|pixel art|flat color|イラスト|アニメ|水彩|厚塗り|線画|ちび|レトロ|風格|插畫|厚塗|水彩|水墨|油畫|像素|動漫|國風|古風|塗鴉|手繪|韓系|美妝|雜誌|海報|蠟筆|素描|立體|寫實|寫意|簡筆)/i]
];
function normLabel(s) { return (s || '').replace(/^[-*•·\s]+/, '').replace(/[\s：:]+$/, '').replace(/\s+/g, '').toLowerCase(); }
function pickSlot(cands, keys) { for (let i = 0; i < cands.length; i++) { if (keys.indexOf(cands[i]) >= 0) return cands[i]; } return ''; }
function scoreBucket(frag) {
  let best = '', bestN = 0;
  for (let i = 0; i < PARSE_HINTS.length; i++) {
    const mm = frag.match(new RegExp(PARSE_HINTS[i][1].source, 'gi'));
    const n = mm ? mm.length : 0;
    if (n > bestN) { bestN = n; best = PARSE_HINTS[i][0]; }
  }
  return best;
}
function verbOf(v) {
  if (/替换|replace/i.test(v)) return 'replace';
  if (/改为|改成|变成|change/i.test(v)) return 'change';
  if (/添加|加上|增加|add/i.test(v)) return 'add';
  if (/移除|删掉|去掉|remove/i.test(v)) return 'remove';
  if (/使|让|make/i.test(v)) return 'make';
  return 'change';
}
function extractNijiParams(t) {
  const p = {}; let n = 0, rest = t;
  const take = (re, fn) => { const mm = rest.match(re); if (mm) { fn(mm); rest = rest.replace(re, ' '); n++; } };
  take(/--stylize\s+(\d+)/i, (mm) => { p.stylizeOn = true; p.stylize = +mm[1]; });
  take(/--s\s+(\d+)/i, (mm) => { p.stylizeOn = true; p.stylize = +mm[1]; });
  take(/--chaos\s+(\d+)/i, (mm) => { p.chaosOn = true; p.chaos = +mm[1]; });
  take(/--c\s+(\d+)/i, (mm) => { p.chaosOn = true; p.chaos = +mm[1]; });
  take(/--style\s+raw/i, () => { p.raw = true; });
  take(/--raw\b/i, () => { p.raw = true; });
  take(/--sw\s+(\d+)/i, (mm) => { p.sw = +mm[1]; });
  take(/--sref\s+([\d\s:]+)/i, (mm) => { p.srefOn = true; p.sref = mm[1].trim(); });
  take(/--weird\s+(\d+)/i, (mm) => { p.weirdOn = true; p.weird = +mm[1]; });
  take(/--w\s+(\d+)/i, (mm) => { p.weirdOn = true; p.weird = +mm[1]; });
  take(/--no\s+([^-\n]+)/i, (mm) => { p.no = mm[1].trim().replace(/[,\s]+$/, ''); });
  take(/--niji\s*\d*/i, () => {});
  return { rest: rest.replace(/\s{2,}/g, ' ').trim(), p, n };
}
/* 把一段提示词拆回槽位；返回 { n, filled, extraN, params } */
function parseToSlots(text, mk) {
  const m = modelByKey(mk);
  let t = (text || '').trim();
  if (!t) return { n: 0, filled: [], extraN: 0, params: 0 };
  const keys = slotsOf(m).map((s) => s.k);
  const has = (k) => keys.indexOf(k) >= 0;
  let params = 0;
  if (m.params) { const ex = extractNijiParams(t); if (ex.n) { t = ex.rest; params = ex.n; Object.assign(state.params, ex.p); } }
  const lines = t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const blocks = [];
  lines.forEach((ln) => {
    const mm = ln.match(/^([^\s：:]{1,16})\s*[：:]\s*(.*)$/);
    const lab = mm ? normLabel(mm[1]) : '';
    if (mm && LABEL_ALIAS[lab]) blocks.push({ label: lab, value: mm[2].trim() });
    else if (blocks.length && blocks[blocks.length - 1].label) blocks[blocks.length - 1].value += '\n' + ln.replace(/^[-*•·]\s*/, '');
    else blocks.push({ label: '', value: ln.replace(/^[-*•·]\s*/, '') });
  });
  const merged = [];
  blocks.forEach((b) => {
    if (!b.label && merged.length && !merged[merged.length - 1].label) merged[merged.length - 1].value += '\n' + b.value;
    else merged.push({ label: b.label, value: b.value });
  });
  const fresh = {}; const filled = []; let extraN = 0;
  const put = (k, v) => {
    v = (v || '').trim().replace(/^[，,、;；\s]+|[，,、;；\s]+$/g, '');
    if (!v) return;
    const sep = (m.syntax === 'tags' || m.syntax === 'comma') ? '，' : '\n';
    fresh[k] = fresh[k] ? fresh[k] + sep + v : v;
    if (filled.indexOf(k) < 0) filled.push(k);
  };
  /* 编辑句式预判：把X改成Y / 将X替换成Y / 在X添加Y → 编辑动作 + 被改部分 + 新元素。
     注意「转换成」必须排在「换成」前面，否则会被从中间切开 */
  if (has('target') || has('change')) {
    const EDIT_RE = /(?:请|請|帮|幫)?\s*(?:把|将|將)?\s*([^，。；;、\n]{1,40}?)\s*(替换成为|替换为|替换成|替换|转换成为|转换成|转换为|转为|转化为|改为|改成|换成|变成|添加|加上|增加|移除|删掉|去掉|套用|应用于|翻译为|翻译成|翻译|上色|补全|重绘|替換成為|替換為|替換成|替換|轉換成為|轉換成|轉換為|轉為|轉化為|改為|改成|換成|變成|添加|加上|增加|移除|刪掉|去掉|套用|應用於|翻譯為|翻譯成|翻譯|上色|補全|重繪)\s*([^，。；;\n]{1,45})/;
    const clean = (s) => (s || '').replace(/^[\s"'“”‘’「」【】-]+/, '').replace(/^[把将请]\s*/, '').replace(/[\s"'“”‘’」】]+$/, '').trim();
    merged.forEach((b) => {
      if (b.label) return;
      const mm = b.value.replace(/^[\s"'“”‘’]+/, '').match(EDIT_RE);
      if (!mm) return;
      if (has('verb')) put('verb', verbOf(mm[2]));
      if (has('change')) put('change', clean(mm[1]));
      if (has('target')) put('target', clean(mm[3]));
      b.value = b.value.replace(mm[0], ' ').trim();
    });
  }
  /* 片段切分：逗号/顿号/分号/换行都算分界；以 and / with / wearing 这类连词开头的片段
     是上一句的续写（英文长句提示词很常见），并回上一段，避免被拆成半句乱归类 */
  const CONT_RE = /^(and|with|in|on|of|at|plus|while|wearing|holding|standing|sitting|resting|carrying|along)\b/i;
  const fragsOf = (value) => {
    const raw = value.split(/[，,、；;\n]+/)
      .map((x) => x.replace(/^[-*•·]\s*/, '').replace(/^\(|\)$/g, '').trim()).filter(Boolean);
    const out = [];
    raw.forEach((f) => {
      if (out.length && CONT_RE.test(f)) out[out.length - 1] += '，' + f;
      else out.push(f);
    });
    return out;
  };
  /* 主体预判：无标签内容里，第一段「自己归不了类」的短语往往就是主体
     （Michiru Saotome from Getter Robo / 1girl / 一位穿汉服的少女）；
     都不符合时再退回到人物名词匹配 */
  const SUBJ_RE = /(少女|少年|女孩|男孩|女性|男性|人物|角色|主角|女王|公主|武士|战士|骑士|猫|狗|鸟|兔|机甲|机器人|肖像|girl|boy|woman|man|character|warrior|knight|robot)/i;
  if (has('subject') && !fresh.subject) {
    let hit = '';
    for (let bi = 0; bi < merged.length && !hit; bi++) {
      const b = merged[bi];
      if (b.label) continue;
      const frs = fragsOf(b.value);
      for (let fi = 0; fi < frs.length; fi++) {
        if (!scoreBucket(frs[fi]) && frs[fi].length <= 60) { hit = frs[fi]; frs[fi] = ''; break; }
      }
      if (hit) b.value = frs.filter(Boolean).join('，');
    }
    if (!hit) {
      for (let bi = 0; bi < merged.length && !hit; bi++) {
        const b = merged[bi];
        if (b.label) continue;
        const frs = fragsOf(b.value);
        for (let fi = 0; fi < frs.length; fi++) {
          const bb = scoreBucket(frs[fi]);
          /* 只排除「结构性」的句子（参考图 / 保持条件 / 比例 / 文字），
             像「一位穿汉服的少女」这种含服装词但其实是主体的句子要保留 */
          if (bb === 'ref' || bb === 'keep' || bb === 'ratio' || bb === 'texts' || bb === 'negative') continue;
          if (SUBJ_RE.test(frs[fi]) && frs[fi].length <= 60) { hit = frs[fi]; frs[fi] = ''; break; }
        }
        if (hit) b.value = frs.filter(Boolean).join('，');
      }
    }
    if (hit) put('subject', hit);
  }
  merged.forEach((b) => {
    if (b.label) {
      const k = pickSlot(LABEL_ALIAS[b.label], keys);
      const parts = b.value.split('\n');
      parts.forEach((ln, i) => {
        const s = ln.trim();
        if (!s) return;
        if (i === 0) { if (k) put(k, k === 'verb' ? verbOf(s) : s); return; }
        /* 标签段落里的后续行：能自己归类就归到别的槽位（例：分点式里混进来的一行参考图要求） */
        const bucket = scoreBucket(s);
        const k2 = bucket ? pickSlot(BUCKET_SLOTS[bucket], keys) : '';
        if (k2 && k2 !== k) put(k2, s.replace(/^[-*•·]\s*/, ''));
        else if (k) put(k, s.replace(/^[-*•·]\s*/, ''));
      });
      return;
    }
    fragsOf(b.value).forEach((frag) => {
      const bucket = scoreBucket(frag);
      let k = bucket ? pickSlot(BUCKET_SLOTS[bucket], keys) : '';
      if (!k) k = has('subject') && !fresh.subject ? 'subject' : (has('extra') ? 'extra' : keys[keys.length - 1]);
      if (k === 'extra') extraN++;
      put(k, frag);
    });
  });
  if (!filled.length) return { n: 0, filled: [], extraN: 0, params };
  state.slots[mk] = fresh;
  return { n: filled.length, filled, extraN, params };
}
function slotLabel(m, k) { const s = slotsOf(m).filter((x) => x.k === k)[0]; return s ? s.label : k; }
/* 把成品框里的内容解析到槽位（auto=true 时来自粘贴，原文保留在成品框） */
function parseFromOut() {
  const m = modelByKey(state.model);
  const box = $('#outText');
  const txt = box.value || '';
  if (!txt.trim()) { toast('成品框是空的，先把提示词粘进来'); return; }
  const keep = txt;
  const r = parseToSlots(txt, state.model);
  if (!r.n) { toast('没有认出可拆的内容，已保留原文'); return; }
  state.locked = true;
  save(); renderSlots(); renderParams(); refresh();
  box.value = keep;
  const names = r.filled.filter((k) => k !== 'extra').map((k) => slotLabel(m, k));
  if ($('#lockHint')) {
    $('#lockHint').textContent = '已解析到槽位：' + (names.join('、') || '（都在「其他」里）')
      + (r.extraN ? '；另有 ' + r.extraN + ' 段进了「其他」' : '')
      + (r.params ? '；识别到 ' + r.params + ' 个后缀参数已填参数面板' : '')
      + ' · 点「从槽位重建」可按槽位重排输出';
  }
  toast('已把内容拆进 ' + r.filled.length + ' 个槽位，原文保留在上方');
}

/* ============================================================
   7. 体检规则（全部来自案例统计出的反模式）
   ============================================================ */
function check(text, mk) {
  const m = modelByKey(mk);
  const W = [];
  const add = (level, msg, fix) => W.push({ level, msg, fix });
  const t = text || '';
  if (!t.trim()) { add('tip', '还没有内容', '先在左侧填槽位，或直接在这里手写。'); return W; }
  const cjk = HAS_CJK.test(t);
  const isNiji = m.syntax === 'tags';
  const params = t.match(/(^|\s)--[a-zA-Z]+/g) || [];
  const ratio = t.match(/\d+\s*[:：]\s*\d+/g) || [];
  const quality = t.match(/(8k|4k|超清|超高清|极致细节|杰作|masterpiece|best quality|hdr|高清|极高细节)/gi) || [];
  const negatives = t.match(/(不要|避免|禁止|无文字|不要出现|负面)/g) || [];
  const quotedText = /["“”「『]/.test(t);

  if (isNiji) {
    if (/--ar\b/.test(t)) add('err', '误用 --ar', 'Niji 7 全库 0 条使用 --ar，删掉它。');
    if (/--styleraw/.test(t)) add('err', '误写 --styleraw', '中间要有空格：--style raw。');
    if (params.indexOf('--niji') < 0 && !/--niji/.test(t)) add('warn', '缺 --niji 7', '补上，这是必带参数。');
    if (/\(\s*[^()]{1,30}\s*[:：]\s*[\d.]+\s*\)/.test(t)) add('warn', '出现了权重括号 (xxx:1.5)', 'Niji 7 不吃权重语法，删掉或改为普通形容。');
    if (t.split('\n').length > 2) add('tip', '标签流建议单行', '每个标签之间用逗号隔开即可，换行会削弱关联。');
    if (state.params.stylizeOn && state.params.stylize > 800) add('warn', '--stylize 开到 ' + state.params.stylize, '800+ 会装饰过度、轮廓失准，建议 200–600。');
    if (!/--no\b/.test(t)) add('tip', '没写 --no', '建议带上 --no text, watermark, blur, bad hands。');
  } else {
    if (params.length) add('warn', '该模型不吃 -- 参数', '检测到 ' + params.slice(0, 3).join(' ') + '，' + m.name + ' 应删掉参数，改用文字描述。');
    if (m.syntax === 'comma' && negatives.length) add('warn', '即梦不吃负面词', '把"不要/避免/禁止"改写成正面描述（例：把"不要人群"写成"空旷无人的街道"）。');
  }
  if (quality.length > 3) add('warn', '质量词堆了 ' + quality.length + ' 个', '只留 1–3 个，写多了互相稀释权重。');
  if (ratio.length > 1) add('warn', '比例写了 ' + ratio.length + ' 次', '比例只写一次，否则模型可能在 ' + ratio.join(' / ') + ' 之间摇摆。');
  else if (!ratio.length && (m.syntax === 'spec' || m.syntax === 'lines')) add('tip', '没写画幅比例', '海报 / 截图类几乎都要写明 9:16、4:5、16:9 等。');
  const tNoNeg = t.replace(/(无|不要|不含|没有|严禁|禁止|排除|no)\s*[^，。；\n]{0,6}?(文字|文案|标题|标语|水印)/g, '');
  if (/(文字|文案|标题|标语)/.test(tNoNeg) && !quotedText) add('warn', '提到文字但没逐字给出', '画面上每个字都要引号逐字写出，并给出位置与字体风格，否则必乱码。');
  if (/(\d+\s*[×x*]\s*\d+|三视图|表情表|精灵表|分格|九宫格|姿势表|多格)/.test(t) && !/(一致|不变|保持同一|相同)/.test(t)) {
    add('warn', '多格图缺一致性条款', '加一句"全部格子保持脸部/发型/配色/服装一致，看不清处保守补全"。');
  }
  if (/(参考图|参考图片|上传的图|上传的角色)/.test(t) && !/(保持|不变|一致|不要修改|禁止)/.test(t)) {
    add('warn', '用了参考图却没写"保持什么"', '编辑类必须先锁身份：保持五官/发型/服装/配饰完全一致。');
  }
  if (/透明/.test(t) && /(如果|若|可以的话|尽量)/.test(t)) add('warn', '透明底写成了条件句', '改成硬性要求"必须输出透明背景"，否则会退回白底。');
  if (negatives.length >= 3) add('tip', '负面词偏多', '肯定式描述比否定式更有效：先说清"要什么"，再补一句限制。');
  // 中英粘连：只看 3 个字母以上的英文词，并放过中文里常见的缩写（无UI界面 / 无Logo）
  const WHITE = ['logo', 'app', 'pvc', 'hdr', 'gif', 'web', 'api', 'ui', 'ux', 'rgb', 'cmyk', 'fps', 'led', 'lcd', 'oled', 'jpg', 'png', 'webp', 'ost', 'bpm', 'gpt', 'ai'];
  const glued = [];
  const scan = /[\u4e00-\u9fff]([A-Za-z]{2,})|([A-Za-z]{2,})[\u4e00-\u9fff]/g;
  let mm; const clean = t.replace(/--[a-zA-Z]+/g, '');
  while ((mm = scan.exec(clean))) {
    const w = (mm[1] || mm[2] || '').toLowerCase();
    if (w.length >= 3 && WHITE.indexOf(w) < 0) glued.push(w);
  }
  if (glued.length) add('warn', '中英文粘在一起了（' + glued.slice(0, 3).join('、') + '）', '相邻的中英文之间要有逗号或空格，否则会被当成一个词。');
  const len = t.length;
  if (isNiji && len < 60) add('tip', '偏短（' + len + ' 字）', '案例中位数约 191 字，太短容易缺风格与光线。');
  if (!isNiji && len < 80) add('tip', '偏短（' + len + ' 字）', '案例中位数 245 字（GPT Image-2 约 329 字），可再补光线与材质。');
  if (len > 1000) add('tip', '偏长（' + len + ' 字）', '过长会让后半段的约束被稀释，考虑分点或删掉同义堆叠。');
  const filled = m.slots.filter((s) => slotVal(mk, s.k).trim()).length;
  if (filled && filled < Math.min(5, m.slots.length)) add('tip', '槽位只填了 ' + filled + '/' + m.slots.length, '至少补齐：主体、风格、镜头构图、光线。');
  if (!W.length) add('ok', '没发现问题', '结构符合该模型的高频写法，可以直接复制去出图了。');
  return W;
}

/* ============================================================
   8. 渲染：模型选择 / 槽位 / 参数
   ============================================================ */
function renderModelPicker() {
  $('#modelPicker').innerHTML = MODELS.map((m) =>
    '<button class="mpick' + (m.key === state.model ? ' on' : '') + '" data-m="' + m.key + '">' +
    '<b>' + esc(m.name) + '</b><span>' + esc(m.tag) + '</span></button>').join('');
  $$('#modelPicker .mpick').forEach((b) => b.onclick = () => {
    state.model = b.dataset.m; state.locked = false; save(); renderAll(); lockNote('');
  });
  $('#modelTip').textContent = modelByKey(state.model).tip;
}
function renderSlots() {
  const m = modelByKey(state.model);
  $('#slotForm').innerHTML = slotsOf(m).map((s) => {
    const v = slotVal(m.key, s.k);
    let field;
    if (s.type === 'select') {
      field = '<select data-k="' + s.k + '">' + s.options.map((o) => '<option value="' + o[0] + '"' + ((v || 'change') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    } else if (s.multi) {
      field = '<textarea data-k="' + s.k + '" placeholder="' + esc(s.ph) + '">' + esc(v) + '</textarea>';
    } else {
      field = '<input type="text" data-k="' + s.k + '" placeholder="' + esc(s.ph) + '" value="' + esc(v) + '">';
    }
    return '<div class="slot' + (s.custom ? ' custom' : '') + '"><label><b>' + esc(s.label) + '</b><i>' + esc(s.note || '') + '</i></label><div class="field">' + field
      + (s.custom ? '<button class="delk" data-delk="' + esc(s.k) + '" title="删除这个自定义槽位">×</button>' : '') + '</div></div>';
  }).join('');
  const cnt = (state.custom && state.custom[m.key] || []).length;
  if ($('#slotCount')) $('#slotCount').textContent = slotsOf(m).length + ' 个槽位' + (cnt ? '（含 ' + cnt + ' 个自定义）' : '');
  $$('#slotForm [data-k]').forEach((el) => {
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => { setSlot(m.key, el.dataset.k, el.value); state.locked = false; save(); refresh(); });
  });
  $$('#slotForm [data-delk]').forEach((el) => {
    el.addEventListener('click', () => delCustomSlot(m.key, el.dataset.delk));
  });
}
function addCustomSlot() {
  const m = modelByKey(state.model);
  const name = (window.prompt('新槽位名称（例如：镜头参数 / 参考图 / 版本备注）', '') || '').trim();
  if (!name) return;
  if (!state.custom[m.key]) state.custom[m.key] = [];
  state.custom[m.key].push({ k: 'x' + Date.now().toString(36) + Math.floor(Math.random() * 99), label: name.slice(0, 20) });
  save(); renderSlots(); refresh();
  toast('已添加槽位「' + name.slice(0, 20) + '」');
}
function delCustomSlot(mk, k) {
  const list = (state.custom[mk] || []).filter((x) => x.k !== k);
  state.custom[mk] = list;
  if (state.slots[mk]) delete state.slots[mk][k];
  save(); renderSlots(); refresh();
}
function renderParams() {
  const p = state.params;
  const box = $('#paramPanel');
  if (modelByKey(state.model).syntax !== 'tags') {
    box.innerHTML = '<p class="empty">' + esc(modelByKey(state.model).name) + ' 不使用后缀参数；比例与风格请写进槽位。</p>';
    return;
  }
  const row = (id, label, note, inner, val) =>
    '<div class="param-row"><div class="pl"><b>' + label + '</b><br><i>' + note + '</i></div>' + inner + '<div class="pv">' + val + '</div></div>';
  box.innerHTML =
    '<label class="switch"><input type="checkbox" id="p-stylizeOn"' + (p.stylizeOn ? ' checked' : '') + '> 启用 --stylize（美学强度）</label>' +
    row('s', '--stylize', '200–600 最佳', '<input type="range" id="p-stylize" min="0" max="1000" step="50" value="' + p.stylize + '">', p.stylize) +
    '<label class="switch"><input type="checkbox" id="p-chaosOn"' + (p.chaosOn ? ' checked' : '') + '> 启用 --chaos（四图差异）</label>' +
    row('c', '--chaos', '0–10 一致 / 50+ 发散', '<input type="range" id="p-chaos" min="0" max="100" step="5" value="' + p.chaos + '">', p.chaos) +
    '<label class="switch"><input type="checkbox" id="p-raw"' + (p.raw ? ' checked' : '') + '> --raw（严格遵循提示词）</label>' +
    '<label class="switch"><input type="checkbox" id="p-srefOn"' + (p.srefOn ? ' checked' : '') + '> 启用 --sref（风格参考码）</label>' +
    row('f', '--sref', '多个用空格分隔', '<input type="text" id="p-sref" placeholder="3397777607" value="' + esc(p.sref) + '">', '') +
    row('w', '--sw', '500–700 最实用', '<input type="range" id="p-sw" min="0" max="1000" step="50" value="' + p.sw + '">', p.sw) +
    row('n', '--no', '排除元素', '<input type="text" id="p-no" value="' + esc(p.no) + '">', '') +
    '<div class="param-out">将追加：<code id="suffixPreview"></code></div>' +
    '<p class="empty" style="margin-top:10px">--ar 不要写（全库 0 条使用）；每个后缀前后都必须有空格。</p>';
  const bind = (id, key, cast) => { const el = $('#' + id); if (el) el.addEventListener('input', () => { state.params[key] = cast ? cast(el.value) : el.value; state.locked = false; save(); refresh(); }); };
  const so = $('#p-stylizeOn'); if (so) so.onchange = () => { p.stylizeOn = so.checked; state.locked = false; save(); refresh(); };
  const co = $('#p-chaosOn'); if (co) co.onchange = () => { p.chaosOn = co.checked; state.locked = false; save(); refresh(); };
  const rw = $('#p-raw'); if (rw) rw.onchange = () => { p.raw = rw.checked; state.locked = false; save(); refresh(); };
  const sf = $('#p-srefOn'); if (sf) sf.onchange = () => { p.srefOn = sf.checked; state.locked = false; save(); refresh(); };
  bind('p-stylize', 'stylize', Number); bind('p-chaos', 'chaos', Number); bind('p-sref', 'sref'); bind('p-sw', 'sw', Number); bind('p-no', 'no');
}
function suffixPreview() {
  const p = state.params;
  let s = '--niji 7';
  if (p.stylizeOn) s += ' --stylize ' + p.stylize;
  if (p.chaosOn) s += ' --chaos ' + p.chaos;
  if (p.raw) s += ' --raw';
  if (p.srefOn && p.sref.trim()) s += ' --sref ' + p.sref.trim() + ' --sw ' + p.sw;
  if (p.weirdOn) s += ' --weird ' + p.weird;
  if (p.no.trim()) s += ' --no ' + p.no.trim();
  return s;
}

/* ============================================================
   9. 输出 + 体检渲染
   ============================================================ */
function lockNote(msg) { $('#lockHint').textContent = msg || ''; }
function refresh() {
  const m = modelByKey(state.model);
  if (!state.locked) $('#outText').value = buildOutput();
  const t = $('#outText').value;
  $('#outText').className = m.lang === 'en' ? 'en' : '';
  $('#outMeta').textContent = m.name + ' · ' + t.length + ' 字' + (t.trim() ? ' · ' + t.trim().split('\n').length + ' 行' : '');
  const sp = $('#suffixPreview'); if (sp && m.syntax === 'tags') sp.textContent = suffixPreview();
  const W = check(t, state.model);
  $('#issues').innerHTML = W.map((w) => {
    const icon = { err: '✕', warn: '!', tip: 'i', ok: '✓' }[w.level];
    const label = { err: '必须改', warn: '建议改', tip: '提示', ok: '通过' }[w.level];
    return '<div class="issue ' + w.level + '"><i>' + icon + '</i><div><b>' + label + '：' + esc(w.msg) + '</b>' +
      (w.fix ? '<br><span class="fix">' + esc(w.fix) + '</span>' : '') + '</div></div>';
  }).join('');
  scheduleHistory();
}

/* ============================================================
   10. 词库插入
   ============================================================ */
function renderLibTabs() {
  const m = modelByKey(state.model);
  const useEn = m.lang === 'en';
  const keys = LIB_ORDER.filter((k) => (useEn ? LIB[k].env.length : LIB[k].zhv.length));
  const tabs = [{ k: 'mine', label: '我的词条' + (state.favs.length ? ' (' + state.favs.length + ')' : '') }]
    .concat(keys.map((k) => ({ k: k, label: useEn ? LIB[k].en : LIB[k].zh })));
  if (!tabs.some((t) => t.k === state.libTab)) state.libTab = (tabs.filter((t) => t.k !== 'mine')[0] || tabs[0]).k;
  $('#libTabs').innerHTML = tabs.map((t) => '<button class="lib-tab' + (t.k === state.libTab ? ' on' : '') + (t.k === 'mine' ? ' mine' : '') +
    '" data-l="' + t.k + '">' + esc(t.label) + '</button>').join('');
  $$('#libTabs .lib-tab').forEach((b) => b.onclick = () => { state.libTab = b.dataset.l; renderLibTabs(); renderChips(); });
}
function renderChips() {
  if (state.libTab === 'mine') {
    if (!state.favs.length) {
      $('#libChips').innerHTML = '<p class="empty">还没有自己的词条。填好槽位后点成品框下的「存为词条」，它就会出现在这里，之后可一键插入到光标处。</p>';
      return;
    }
    $('#libChips').innerHTML = state.favs.map((f, i) => '<button class="chip mine" data-wi="' + i + '" title="' + esc(oneLine(f.text, 140)) + '">' +
      esc(f.title || oneLine(f.text, 18)) + '</button>').join('');
    $$('#libChips [data-wi]').forEach((c) => c.onclick = () => { const f = state.favs[+c.dataset.wi]; if (f) insertWord(f.text); });
    return;
  }
  const m = modelByKey(state.model);
  const useEn = m.lang === 'en';
  const list = useEn ? LIB[state.libTab].env : LIB[state.libTab].zhv;
  $('#libChips').innerHTML = list.map((w) => '<button class="chip" data-w="' + esc(w) + '">' + esc(w) + '</button>').join('');
  $$('#libChips .chip').forEach((c) => c.onclick = () => insertWord(c.dataset.w));
}
let lastFocus = null;
document.addEventListener('focusin', (e) => {
  if (e.target.matches('#slotForm input, #slotForm textarea, #outText')) lastFocus = e.target;
});
function insertWord(word) {
  const el = lastFocus;
  if (!el) { toast('先点一下要填的槽位，再点词库'); return; }
  const sep = (el.id === 'outText') ? (modelByKey(state.model).lang === 'en' ? ', ' : '，') : (/,|，|\s$/.test(el.value) || !el.value ? '' : ', ');
  const start = el.selectionStart == null ? el.value.length : el.selectionStart;
  const end = el.selectionEnd == null ? el.value.length : el.selectionEnd;
  const before = el.value.slice(0, start), after = el.value.slice(end);
  el.value = before + (before && !/[\s,，]$/.test(before) ? sep : '') + word + after;
  const pos = (before + (before && !/[\s,，]$/.test(before) ? sep : '') + word).length;
  el.setSelectionRange(pos, pos); el.focus();
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}

/* ============================================================
   11. 收藏
   ============================================================ */
function autoTitle(m, t) {
  const s = state.slots[m.key] || {};
  const first = m.slots.map((x) => s[x.k]).filter((v) => v && String(v).trim())[0];
  return String(first || t.replace(/\s+/g, ' ')).slice(0, 26);
}
// 存一条词条（同名/同文去重，新的在最前）
function addFav(text, title, m) {
  const t = String(text || '').trim();
  if (!t) return false;
  const name = String(title || '').trim().slice(0, 40) || autoTitle(m || modelByKey(state.model), t);
  const dup = state.favs.findIndex((f) => f.text === t);
  if (dup > -1) state.favs.splice(dup, 1);
  state.favs.unshift({ title: name, text: t, model: m ? m.name : '', at: Date.now() });
  state.favs = state.favs.slice(0, 200);
  save(); renderFavs(); renderMine(); renderLibTabs(); renderChips(); renderMineMeta();
  return name;
}
function loadFavInto(f) {
  if (!f) return;
  const mm = modelByName(f.model);
  if (mm) state.model = mm.key;
  const res = parseToSlots(f.text, state.model);
  state.locked = true; renderAll(); renderSlots(); refresh(); $('#outText').value = f.text;
  lockNote(res.n ? '已载入词条，并自动拆进 ' + res.n + ' 个槽位（可逐格改，点「从槽位重建」重排）' : '已载入词条（手动模式，改回槽位请点「解析到槽位」）');
  switchTab('gen'); toast(res.n ? '已载入词条并拆进 ' + res.n + ' 个槽位' : '已载入词条');
}
function renderFavs() {
  if (!state.favs.length) {
    $('#favList').innerHTML = '<p class="empty">还没有自己的词条。填好槽位后点「存为词条」，或到「我的库」里保存当前成品；保存后这里出现，可一键插入到光标处。</p>';
    return;
  }
  const show = state.favs.slice(0, 6);
  $('#favList').innerHTML = show.map((f, i) => '<div class="fav"><span class="ft">' + esc(f.title || (f.text.slice(0, 30) + '…')) +
    '<br><span class="fm">' + esc(f.model) + '</span></span>' +
    '<button class="btn tiny" data-ins="' + i + '">插入</button>' +
    '<button class="btn tiny" data-load="' + i + '">载入</button><button class="btn tiny" data-copy="' + i + '">复制</button><button class="btn tiny danger" data-del="' + i + '">删</button></div>').join('') +
    (state.favs.length > show.length ? '<p class="empty">还有 ' + (state.favs.length - show.length) + ' 条，见「我的库」。</p>' : '');
  $$('#favList [data-ins]').forEach((b) => b.onclick = () => insertMine(+b.dataset.ins));
  $$('#favList [data-load]').forEach((b) => b.onclick = () => loadFavInto(state.favs[+b.dataset.load]));
  $$('#favList [data-copy]').forEach((b) => b.onclick = () => copyText(state.favs[+b.dataset.copy].text));
  $$('#favList [data-del]').forEach((b) => b.onclick = () => { state.favs.splice(+b.dataset.del, 1); save(); renderFavs(); renderMine(); renderLibTabs(); renderChips(); renderMineMeta(); });
}

/* ============================================================
   11.5 我的库：词条管理 + 生成历史
   ============================================================ */
function pad2(n) { return String(n).padStart(2, '0'); }
function fmtWhen(ts) {
  const d = new Date(ts || 0);
  if (isNaN(d.getTime())) return '';
  const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return '今天 ' + hm;
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
}
function oneLine(t, n) { return String(t || '').replace(/\s+/g, ' ').trim().slice(0, n); }
function renderMineMeta() {
  const c = $('#mineCount'); if (c) c.textContent = state.favs.length ? '(' + state.favs.length + ')' : '';
  const a = $('#mineMeta'); if (a) a.textContent = state.favs.length + ' 条 · 点「插入」写到光标处';
  const b = $('#histMeta'); if (b) b.textContent = state.history.length + ' / 100 条 · 自动记录';
}
function renderMine() {
  const box = $('#mineList'); if (!box) return;
  const q = state.mineQ.trim().toLowerCase();
  const rows = state.favs.map((f, i) => ({ f: f, i: i }))
    .filter((o) => !q || ((o.f.title || '') + ' ' + o.f.text).toLowerCase().indexOf(q) > -1);
  if (!rows.length) {
    box.innerHTML = '<p class="empty">' + (state.favs.length ? '没有匹配的词条。' : '还没有自己的词条。在生成器里填好槽位后点「存为词条」，或改好成品框内容后点上方「保存当前成品」。') + '</p>';
    renderMineMeta(); return;
  }
  box.innerHTML = rows.map((o) => {
    const f = o.f, i = o.i;
    return '<div class="fav col"><div class="fhead"><span class="ft">' + esc(f.title || oneLine(f.text, 30)) + '</span>' +
      '<span class="fm">' + esc(f.model || '未知模型') + ' · ' + fmtWhen(f.at) + ' · ' + String(f.text || '').length + ' 字</span></div>' +
      '<pre class="fp">' + esc(oneLine(f.text, 200)) + '</pre>' +
      '<div class="fbtns"><button class="btn tiny" data-mins="' + i + '">插入到光标处</button>' +
      '<button class="btn tiny" data-mload="' + i + '">载入生成器</button>' +
      '<button class="btn tiny" data-mcopy="' + i + '">复制</button>' +
      '<button class="btn tiny" data-mren="' + i + '">改名</button>' +
      '<button class="btn tiny danger" data-mdel="' + i + '">删除</button></div></div>';
  }).join('');
  renderMineMeta();
}
function renderHistory() {
  const box = $('#histList'); if (!box) return;
  const q = state.histQ.trim().toLowerCase();
  const rows = state.history.map((e, i) => ({ e: e, i: i }))
    .filter((o) => !q || String(o.e.text || '').toLowerCase().indexOf(q) > -1);
  if (!rows.length) {
    box.innerHTML = '<p class="empty">' + (state.history.length ? '没有匹配的历史。' : '还没有历史。在生成器里填槽或改成品框，停手 2 秒就会自动记一条（最多留 100 条，内容相同的自动合并到最新）。') + '</p>';
    renderMineMeta(); return;
  }
  box.innerHTML = rows.map((o) => {
    const e = o.e, i = o.i;
    return '<div class="fav col"><div class="fhead"><span class="ft">' + esc(oneLine(e.text, 46)) + '</span>' +
      '<span class="fm">' + esc(e.model || '未知模型') + ' · ' + fmtWhen(e.at) + ' · ' + String(e.text || '').length + ' 字' +
      (e.slots && Object.keys(e.slots).length ? ' · 含槽位' : '') + '</span></div>' +
      '<pre class="fp">' + esc(oneLine(e.text, 240)) + '</pre>' +
      '<div class="fbtns"><button class="btn tiny" data-hload="' + i + '">载入</button>' +
      '<button class="btn tiny" data-hcopy="' + i + '">复制</button>' +
      '<button class="btn tiny" data-hfav="' + i + '">存为词条</button>' +
      '<button class="btn tiny danger" data-hdel="' + i + '">删除</button></div></div>';
  }).join('');
  renderMineMeta();
}
// 插入到光标处；没有可用光标时退化为载入生成器
function insertMine(i) {
  const f = state.favs[i]; if (!f) return;
  const usable = lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null;
  if (usable) { switchTab('gen'); lastFocus.focus(); insertWord(f.text); }
  else { loadFavInto(f); }
}
// ---- 生成历史：自动记录（防抖 2s，同文合并，上限 100）----
let histTimer = null, histArmed = false;
function scheduleHistory() {
  if (!histArmed) return;
  if (histTimer) clearTimeout(histTimer);
  histTimer = setTimeout(() => { histTimer = null; pushHistory(); }, 2000);
}
function pushHistory(force) {
  const t = $('#outText').value.trim();
  if (!t || t.length < 8 || !/[A-Za-z\u4e00-\u9fff\u3040-\u30ff]/.test(t)) return false;
  const m = modelByKey(state.model);
  const h = state.history;
  if (h.length && h[0].text === t) { h[0].at = Date.now(); h[0].model = m.name; save(); renderHistory(); return false; }
  const old = h.findIndex((e) => e.text === t);
  if (old > -1) h.splice(old, 1);
  h.unshift({
    at: Date.now(), model: m.name, mk: m.key, text: t,
    slots: JSON.parse(JSON.stringify(state.slots[m.key] || {})),
    params: m.syntax === 'tags' ? JSON.parse(JSON.stringify(state.params)) : null
  });
  state.history = h.slice(0, 100);
  save(); renderHistory(); renderMineMeta();
  return true;
}
function loadHistory(i) {
  const e = state.history[i]; if (!e) return;
  const mm = modelByKey(e.mk) || modelByName(e.model);
  let n = 0;
  if (mm) {
    state.model = mm.key;
    if (e.slots) state.slots[mm.key] = JSON.parse(JSON.stringify(e.slots));
    else n = parseToSlots(e.text, mm.key).n;
    if (e.params && mm.syntax === 'tags') Object.assign(state.params, e.params);
  }
  state.locked = true; renderAll(); renderSlots(); renderParams(); refresh();
  $('#outText').value = e.text; refresh();
  lockNote(e.slots ? '已载入历史（槽位一起还原，手动模式）' : (n ? '已载入历史，并按内容拆进 ' + n + ' 个槽位' : '已载入历史（手动模式）'));
  switchTab('gen'); toast('已载入这条历史');
}
// ---- 导出 / 导入 ----
function myData() {
  return { app: 'krene-prompt-studio', v: 1, exportedAt: new Date().toISOString(), favs: state.favs, history: state.history };
}
function exportMy() {
  const json = JSON.stringify(myData(), null, 2);
  const d = new Date(), stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'krene-我的词条-' + stamp + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('已导出 ' + state.favs.length + ' 条词条 + ' + state.history.length + ' 条历史');
  } catch (e) { copyText(json); toast('浏览器不支持直接下载，已复制 JSON 到剪贴板'); }
  return json;
}
function importMy(txt, silent) {
  let d = null;
  try { d = JSON.parse(txt); } catch (e) { if (!silent) toast('这个文件不是合法的 JSON'); return false; }
  if (!d || typeof d !== 'object') { if (!silent) toast('内容里没有词条数据'); return false; }
  const favs = Array.isArray(d) ? d : (Array.isArray(d.favs) ? d.favs : []);
  const hist = Array.isArray(d.history) ? d.history : [];
  let nf = 0, nh = 0;
  favs.forEach((f) => {
    if (!f || typeof f.text !== 'string' || !f.text.trim()) return;
    if (state.favs.some((x) => x.text === f.text)) return;
    state.favs.push({ title: String(f.title || '').slice(0, 40), text: f.text, model: f.model || '', at: f.at || Date.now() }); nf++;
  });
  hist.forEach((e) => {
    if (!e || typeof e.text !== 'string' || !e.text.trim()) return;
    if (state.history.some((x) => x.text === e.text)) return;
    state.history.push(e); nh++;
  });
  state.favs.sort((a, b) => (b.at || 0) - (a.at || 0));
  state.history.sort((a, b) => (b.at || 0) - (a.at || 0));
  state.history = state.history.slice(0, 100);
  save(); renderFavs(); renderMine(); renderHistory(); renderLibTabs(); renderChips(); renderMineMeta();
  if (!silent) toast('导入完成：新增 ' + nf + ' 条词条 / ' + nh + ' 条历史');
  return true;
}

/* ============================================================
   12. 模板 / 案例库 / 速查
   ============================================================ */
function renderTemplates() {
  $('#tplGrid').innerHTML = TEMPLATES.map((t, i) =>
    '<div class="tpl"><h3>' + esc(t.name) + '</h3><div class="meta">适用：' + esc(t.model) + ' · ' + esc(t.desc) + '</div>' +
    '<pre>' + esc(t.body) + '</pre><div class="row"><button class="btn primary tiny" data-use="' + i + '">载入生成器</button>' +
    '<button class="btn tiny" data-copy="' + i + '">复制</button></div></div>').join('');
  $$('#tplGrid [data-use]').forEach((b) => b.onclick = () => {
    const t = TEMPLATES[+b.dataset.use];
    const mm = modelByName(t.model.replace(' / Pro', '')) || modelByName(t.model);
    if (mm) state.model = mm.key;
    renderAll(); $('#outText').value = t.body; state.locked = true; refresh();
    lockNote('模板已载入：替换所有【】后即可用');
    switchTab('gen'); toast('已载入模板：' + t.name);
  });
  $$('#tplGrid [data-copy]').forEach((b) => b.onclick = () => copyText(TEMPLATES[+b.dataset.copy].body));
}
const caseState = { page: 1, per: 30 };
// 封面图模式：启动时自动探测 img/ 目录在不在——在就用本地缩略图，不在就直接用站方原图（零上传也能有图）
let IMG_LOCAL = true;
function shotSrc(r) {
  if (IMG_LOCAL && r[7]) return 'img/' + r[7];
  if (r[8]) return r[8];
  return r[7] ? 'img/' + r[7] : '';
}
function probeLocalImg() {
  const first = KRENE_CASES.filter((c) => c[7])[0];
  if (!first) { IMG_LOCAL = false; return Promise.resolve(); }
  return new Promise((res) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; IMG_LOCAL = v; res(); } };
    const im = new Image();
    im.onload = () => fin(true);
    im.onerror = () => fin(false);
    setTimeout(() => fin(false), 4000);
    im.src = 'img/' + first[7];
  });
}
function caseRows() {
  const q = $('#q').value.trim().toLowerCase();
  const fm = $('#fModel').value, fc = $('#fColl').value, sort = $('#fSort').value;
  const feat = $('#fFeat').checked, full = $('#fFull').checked;
  let rows = KRENE_CASES.map((r, i) => ({ r, i }));
  if (feat) rows = rows.filter((x) => x.r[5]);
  if (full) rows = rows.filter((x) => x.r[2]);
  if (fm) rows = rows.filter((x) => x.r[1] === fm);
  if (fc) rows = rows.filter((x) => x.r[4] && x.r[4].split('|').indexOf(fc) >= 0);
  if (q) rows = rows.filter((x) => (x.r[0] + ' ' + x.r[2] + ' ' + x.r[3] + ' ' + x.r[4]).toLowerCase().indexOf(q) >= 0);
  if (sort === 'len-desc') rows.sort((a, b) => b.r[2].length - a.r[2].length);
  else if (sort === 'len-asc') rows.sort((a, b) => a.r[2].length - b.r[2].length);
  else if (sort === 'title') rows.sort((a, b) => a.r[0].localeCompare(b.r[0], 'zh'));
  return rows;
}
function renderCases() {
  const rows = caseRows();
  const show = rows.slice(0, caseState.page * caseState.per);
  $('#filterMeta').textContent = '命中 ' + rows.length + ' / ' + KRENE_CASES.length + ' 条';
  $('#btnMore').style.display = show.length < rows.length ? '' : 'none';
  $('#caseList').innerHTML = show.map((x) => {
    const r = x.r, plain = !HAS_CJK.test(r[2]) && r[2].length > 0;
    const colls = r[4] ? r[4].split('|').map((c) => '<span class="badge">' + esc(c) + '</span>').join('') : '';
    const shot = r[7] || r[8];
    const ssrc = shotSrc(r);
    return '<article class="case' + (shot ? ' has-shot' : '') + '">' +
      (shot ? '<button class="shot" data-shot="' + x.i + '" title="点开看大图">' +
        '<img src="' + esc(ssrc) + '" alt="' + esc(r[0] || '案例封面') + '" loading="lazy" decoding="async"' +
        ' data-remote="' + esc(IMG_LOCAL ? r[8] : '') + '" onerror="shotFallback(this)"><span class="zoom">看大图</span></button>' : '') +
      '<div class="cbody">' +
      '<div class="top"><h3>' + esc(r[0] || '（无标题）') + '</h3>' +
      '<span class="badge ' + (BADGE_OF[r[1]] || '') + '">' + esc(r[1] || '未知模型') + '</span>' +
      (r[5] ? '<span class="badge feat">首页推荐</span>' : '') + '</div>' +
      '<div class="meta"><span>' + esc(r[3] || '佚名') + '</span><span>' + r[2].length + ' 字</span>' + colls + '</div>' +
      '<pre class="' + (plain ? 'en' : '') + '" data-i="' + x.i + '">' + (r[2] ? esc(r[2]) : '<span class="dim">站方原始数据仅存 $xx 跨文件占位符，无正文；点下方链接查看原页。</span>') + '</pre>' +
      '<div class="row">' + (r[2] ? '<button class="btn tiny" data-cp="' + x.i + '">复制</button><button class="btn tiny" data-base="' + x.i + '">以它为基础</button>' : '') +
      (shot ? '<button class="btn tiny" data-shot2="' + x.i + '">看大图</button>' : '') +
      (r[6] ? '<a href="' + esc(r[6]) + '" target="_blank" rel="noopener">原页 ↗</a>' : '') + '</div></div></article>';
  }).join('');
  $$('#caseList pre').forEach((p) => p.onclick = () => p.classList.toggle('open'));
  $$('#caseList [data-cp]').forEach((b) => b.onclick = () => copyText(KRENE_CASES[+b.dataset.cp][2]));
  $$('#caseList [data-base]').forEach((b) => b.onclick = () => {
    const r = KRENE_CASES[+b.dataset.base]; const mm = modelByName(r[1]);
    if (mm) state.model = mm.key;
    renderAll(); switchTab('gen');
    const src = r[2] || '';
    const res = parseToSlots(src, state.model);
    state.locked = true; save(); renderSlots(); renderParams(); refresh();
    $('#outText').value = src;
    lockNote(res.n ? '已载入案例，并自动拆进 ' + res.n + ' 个槽位：逐格改就行，点「从槽位重建」按槽位重排' : '已载入案例（手动模式）：改完再复制');
    toast(res.n ? '已拆进 ' + res.n + ' 个槽位，可直接逐格改' : '已载入案例');
  });
  $$('#caseList [data-shot], #caseList [data-shot2]').forEach((b) => b.onclick = () => openShot(+(b.dataset.shot || b.dataset.shot2)));
}
function renderRef() {
  $('#refParams').innerHTML = '<table class="tbl"><tr><th>参数</th><th>范围</th><th>怎么用</th></tr>' +
    REF_PARAMS.map((r) => '<tr><td><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</table>';
  $('#refDict').innerHTML = '<table class="tbl"><tr><th>类别</th><th>英文写法</th></tr>' +
    REF_DICT.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>').join('') + '</table>';
  $('#refFix').innerHTML = '<table class="tbl"><tr><th>症状</th><th>多半是什么原因</th><th>怎么改</th></tr>' +
    REF_FIX.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</table>';
  $('#refCheck').innerHTML = REF_CHECK.map((c) => '<li>' + esc(c) + '</li>').join('');
}

/* ============================================================
   12.5 封面图：卡片缩略图兜底 + 灯箱看大图
   ============================================================ */
// 本地缩略图缺失时自动换成站方原图；两者都失败则显示占位
function shotFallback(img) {
  const rem = img.getAttribute('data-remote') || '';
  const cur = img.getAttribute('src') || '';
  if (rem && rem !== cur && img.dataset.swapped !== '1') { img.dataset.swapped = '1'; img.src = rem; return; }
  const wrap = img.closest('.shot');
  if (wrap) { wrap.classList.add('dead'); wrap.disabled = true; wrap.innerHTML = '<span class="dead">封面不可用（点下方「原页 ↗」查看）</span>'; }
}
window.shotFallback = shotFallback;

function openShot(i) {
  const r = KRENE_CASES[i]; if (!r) return;
  const lb = $('#lightbox'), im = lb.querySelector('img');
  const local = r[7] ? 'img/' + r[7] : '', remote = r[8] || '';
  im.onerror = () => { if (local && im.getAttribute('src') !== local) { im.onerror = null; im.src = local; } };
  im.src = remote || local;
  lb.querySelector('.lbcap').innerHTML = '<b>' + esc(r[0] || '（无标题）') + '</b><span>' +
    esc(r[1] || '未知模型') + ' · ' + esc(r[3] || '佚名') + ' · ' + r[2].length + ' 字</span>';
  const cp = lb.querySelector('[data-lbcopy]');
  cp.style.display = r[2] ? '' : 'none';
  cp.onclick = () => copyText(r[2]);
  const pg = lb.querySelector('[data-lbpage]');
  if (r[6]) { pg.style.display = ''; pg.href = r[6]; } else { pg.style.display = 'none'; }
  lb.classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeShot() {
  const lb = $('#lightbox');
  if (!lb.classList.contains('on')) return;
  lb.classList.remove('on');
  document.body.style.overflow = '';
  lb.querySelector('img').removeAttribute('src');
}

/* ============================================================
   13. 事件与初始化
   ============================================================ */
function switchTab(name) {
  $$('#tabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $$('.panel').forEach((p) => p.classList.toggle('on', p.id === 'panel-' + name));
  if (name === 'mine') { renderMine(); renderHistory(); renderMineMeta(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderAll() {
  renderModelPicker(); renderSlots(); renderParams(); renderLibTabs(); renderChips();
}
function init() {
  load();
  $('#caseCount').textContent = KRENE_CASES.length;
  // 案例库筛选器
  const models = {}, colls = {};
  KRENE_CASES.forEach((r) => { if (r[1]) models[r[1]] = (models[r[1]] || 0) + 1; if (r[4]) r[4].split('|').forEach((c) => colls[c] = (colls[c] || 0) + 1); });
  $('#fModel').innerHTML = '<option value="">全部模型</option>' + Object.keys(models).sort((a, b) => models[b] - models[a]).map((m) => '<option value="' + esc(m) + '">' + esc(m) + '（' + models[m] + '）</option>').join('');
  $('#fColl').innerHTML = '<option value="">全部合集</option>' + Object.keys(colls).sort((a, b) => colls[b] - colls[a]).map((c) => '<option value="' + esc(c) + '">' + esc(c) + '（' + colls[c] + '）</option>').join('');
  // 标签页
  $$('#tabs .tab').forEach((b) => b.onclick = () => switchTab(b.dataset.tab));
  // 灯箱
  $('#lightbox').onclick = (e) => { if (e.target.id === 'lightbox' || e.target.classList.contains('lbclose')) closeShot(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeShot(); });
  // 生成器按钮
  $('#btnCopy').onclick = () => { const t = $('#outText').value.trim(); if (!t) return toast('还没有内容'); copyText(t); pushHistory(true); };
  $('#btnRebuild').onclick = () => { state.locked = false; refresh(); lockNote(''); toast('已按槽位重建'); };
  $('#btnParse').onclick = () => parseFromOut();
  $('#btnAddSlot').onclick = () => addCustomSlot();
  $('#btnClear').onclick = () => { state.slots[state.model] = {}; state.locked = false; save(); renderSlots(); refresh(); toast('已清空槽位'); };
  $('#btnSample').onclick = () => {
    const m = modelByKey(state.model); state.slots[m.key] = Object.assign({}, m.sample);
    state.locked = false; save(); renderSlots(); refresh(); toast('已填充示例');
  };
  $('#btnRandom').onclick = () => {
    const m = modelByKey(state.model), useEn = m.lang === 'en', o = {};
    m.slots.forEach((s) => {
      if (s.type === 'select') return;
      const src = s.lib && LIB[s.lib] ? (useEn ? LIB[s.lib].env : LIB[s.lib].zhv) : null;
      if (src && src.length) o[s.k] = src[Math.floor(Math.random() * src.length)];
    });
    state.slots[m.key] = o; state.locked = false; save(); renderSlots(); refresh(); toast('随机组合已生成，改动后即成自己的');
  };
  $('#btnSave').onclick = () => {
    const t = $('#outText').value.trim(); if (!t) return toast('还没有内容');
    const m = modelByKey(state.model);
    const name = addFav(t, autoTitle(m, t), m);
    if (name) toast('已存为词条：' + name + '（可在「我的库」改名）');
  };
  // 我的库：一键把成品框内容存为词条
  $('#btnMineFromOut').onclick = () => {
    const t = $('#outText').value.trim(); if (!t) return toast('成品框还是空的');
    const m = modelByKey(state.model);
    const input = $('#mineTitle');
    const name = addFav(t, input.value || autoTitle(m, t), m);
    if (name) { input.value = ''; toast('已保存词条：' + name); }
  };
  $('#mineTitle').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnMineFromOut').click(); });
  $('#btnMineAll').onclick = () => switchTab('mine');
  $('#btnHist').onclick = () => { pushHistory(); switchTab('mine'); };
  $('#mineQ').addEventListener('input', () => { state.mineQ = $('#mineQ').value; renderMine(); });
  $('#histQ').addEventListener('input', () => { state.histQ = $('#histQ').value; renderHistory(); });
  // 词条管理（事件委托）
  $('#mineList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.mins != null) return insertMine(+d.mins);
    if (d.mload != null) return loadFavInto(state.favs[+d.mload]);
    if (d.mcopy != null) return copyText(state.favs[+d.mcopy].text);
    if (d.mren != null) {
      const f = state.favs[+d.mren];
      let n = null;
      try { n = window.prompt('改个名字', f.title || ''); } catch (err) { n = f.title; }
      if (n === null) return;
      f.title = String(n).trim().slice(0, 40) || f.title; save(); renderFavs(); renderMine(); renderLibTabs(); renderChips();
      return toast('已改名');
    }
    if (d.mdel != null) {
      const f = state.favs[+d.mdel];
      if (!window.confirm('删除词条「' + (f.title || oneLine(f.text, 20)) + '」？此操作不可撤销。')) return;
      state.favs.splice(+d.mdel, 1); save(); renderFavs(); renderMine(); renderLibTabs(); renderChips(); renderMineMeta();
      return toast('已删除');
    }
  });
  // 历史管理（事件委托）
  $('#histList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.hload != null) return loadHistory(+d.hload);
    if (d.hcopy != null) return copyText(state.history[+d.hcopy].text);
    if (d.hfav != null) {
      const e2 = state.history[+d.hfav], m = modelByKey(e2.mk) || modelByKey(state.model);
      const name = addFav(e2.text, e2.title || autoTitle(m, e2.text), m);
      return toast('已存为词条：' + name);
    }
    if (d.hdel != null) { state.history.splice(+d.hdel, 1); save(); renderHistory(); return; }
  });
  $('#btnHistClear').onclick = () => {
    if (!state.history.length) return toast('历史已经是空的');
    if (!window.confirm('清空 ' + state.history.length + ' 条生成历史？（词条不受影响）')) return;
    state.history = []; save(); renderHistory(); renderMineMeta(); toast('历史已清空');
  };
  $('#btnMineClear').onclick = () => {
    if (!state.favs.length) return toast('还没有词条');
    if (!window.confirm('清空全部 ' + state.favs.length + ' 条词条？建议先「导出 JSON」备份。')) return;
    state.favs = []; save(); renderFavs(); renderMine(); renderLibTabs(); renderChips(); renderMineMeta(); toast('词条已清空');
  };
  $('#btnMineExport').onclick = () => exportMy();
  $('#btnMineCopyJson').onclick = () => copyText(JSON.stringify(myData(), null, 2));
  $('#btnMineImport').onclick = () => $('#mineFile').click();
  $('#mineFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { importMy(String(r.result || '')); e.target.value = ''; };
    r.onerror = () => toast('读取文件失败');
    r.readAsText(f);
  });
  // 成品框：手动编辑
  $('#outText').addEventListener('input', () => { state.locked = true; lockNote('已手动编辑（不再自动同步）'); refresh(); });
  // 成品框：粘贴即自动拆到槽位（原文保留，可再手改）
  $('#outText').addEventListener('paste', () => setTimeout(() => parseFromOut(), 30));
  // 案例库
  ['#q', '#fModel', '#fColl', '#fSort', '#fFeat', '#fFull'].forEach((s) => {
    const el = $(s); const ev = el.tagName === 'INPUT' && el.type === 'search' ? 'input' : 'change';
    el.addEventListener(ev, () => { caseState.page = 1; renderCases(); });
  });
  $('#btnMore').onclick = () => { caseState.page++; renderCases(); };
  renderAll(); renderFavs(); renderMine(); renderHistory(); renderMineMeta(); renderTemplates(); renderRef(); refresh();
  histArmed = true;   // 初始化时的默认文本不计入历史，之后的每次改动才记
  probeLocalImg().then(renderCases);
}
document.addEventListener('DOMContentLoaded', init);
/* 测试钩子：暴露内部状态，供自动化测试用（不影响正常使用） */
window.__k = {
  get state() { return state; },
  MODELS: MODELS, LIB: LIB, slotsOf: slotsOf, parseToSlots: parseToSlots, parseFromOut: parseFromOut,
  modelByName: modelByName, modelByKey: modelByKey,
  buildOutput: buildOutput, buildNiji: buildNiji, check: check, refresh: refresh,
  renderAll: renderAll, renderSlots: renderSlots, renderCases: renderCases, switchTab: switchTab
};
})();
