const CUSTOMER_SITES = {
    "dyttzy": {
        "api": "https://caiji.dyttzyapi.com/api.php/provide/vod",
        "name": "电影天堂",
        
    },
    "ruyi": {
        "api": "https://cj.rycjapi.com/api.php/provide/vod",
        "name": "如意"
    },
    "bfzy": {
        "api": "https://bfzyapi.com/api.php/provide/vod/",
        "name": "暴风"
    },
    "ffzy": {
        "api": "http://cj.ffzyapi.com/api.php/provide/vod/",
        "name": "非凡|点播"
    },
    "zy360": {
        "api": "https://360zy.com/api.php/provide/vod/",
        "name": "360|点播"
    },
    "maotaizy": {
        "api": "https://caiji.maotaizy.cc/api.php/provide/vod",
        "name": "茅台资源"
    },
    "wolong": {
        "api": "https://collect.wolongzyw.com/api.php/provide/vod/",
        "name": "卧龙|点播"
    },
    "tianya": {
        "api": "https://tyyszyapi.com/api.php/provide/vod/",
        "name": "天涯"
    },
    "jisu": {
        "api": "https://jszyapi.com/api.php/provide/vod",
        "name": "极速资源",
        
    },
    "dbzy": {
        "api": "https://dbzy.tv/api.php/provide/vod",
        "name": "豆瓣资源"
    },
    "mdzy": {
        "api": "https://caiji.moduapi.cc/api.php/provide/vod/",
        "name": "魔都|点播"
    },
    "zuid": {
        "api": "http://zuidazy.me/api.php/provide/vod/",
        "name": "最大|点播"
    },
    "zuid_new": {
        "api": "https://api.zuidapi.com/api.php/provide/vod",
        "name": "最大资源"
    },
    "subo": {
        "api": "https://subocj.com/api.php/provide/vod",
        "name": "速播资源"
    },
    "wujin_new": {
        "api": "https://api.wujinapi.me/api.php/provide/vod/",
        "name": "无尽资源"
    },
    "aiqiyi": {
        "api": "https://iqiyizyapi.com/api.php/provide/vod",
        "name": "爱奇艺"
    },
    "wolong_new": {
        "api": "https://collect.wolongzy.cc/api.php/provide/vod/",
        "name": "卧龙"
    },
    "aikun": {
        "api": "https://ikunzy.vip/api.php/provide/vod/",
        "name": "爱坤资源"
    },
    "lzi": {
        "api": "https://cj.lziapi.com/api.php/provide/vod/",
        "name": "量子|点播"
    },
    "39kan": {
        "api": "http://39kan.com/api.php/provide/vod",
        "name": "39影視"
    },
    "tangrenjie": {
        "api": "http://tangrenjie.tv/api.php/provide/vod/at/xm",
        "name": "唐人街"
    },
    "kudian": {
        "api": "http://api.kuapi.cc/api.php/provide/vod",
        "name": "酷点资源"
    },
    "senlin": {
        "api": "http://slapibf.com/api.php/provide/vod",
        "name": "森林资源"
    },
    "jinying": {
        "api": "http://jyzyapi.com/provide/vod/from/jinyingm3u8",
        "name": "金鹰资源"
    },
    "guangsu": {
        "api": "http://api.guangsuapi.com/api.php/provide/vod/from/gsm3u8",
        "name": "光速资源"
    },
    "yinghuawang": {
        "api": "http://m3u8.apiyhzy.com/api.php/provide/vod",
        "name": "樱花资源网"
    },
    "kuaibo": {
        "api": "http://www.kuaibozy.com/api.php/provide/vod",
        "name": "快播资源"
    },
    "baidu": {
        "api": "https://api.apibdzy.com/api.php/provide/vod/",
        "name": "百度|点播"
    },
    "suoni": {
        "api": "https://suoniapi.com/api.php/provide/vod/",
        "name": "索尼|点播"
    },
    "hongniuzhibo": {
        "api": "https://www.hongniuzy2.com/api.php/provide/vod/",
        "name": "红牛|点播"
    },
    "mdzy_new": {
        "api": "https://www.mdzyapi.com/api.php/provide/vod/",
        "name": "魔都资源新"
    },
    "ffzy5": {
        "api": "http://ffzy5.tv/api.php/provide/vod",
        "name": "非凡影视5"
    }
};



// 调用全局方法合并
if (window.extendAPISites) {
    window.extendAPISites(CUSTOMER_SITES);
} else {
    console.error("错误：请先加载 config.js！");
}

