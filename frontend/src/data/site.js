// 站点全局信息配置
//
// launchedAt：站点首次上线日期，对应 CHANGELOG v1.0.0 的部署记录（2026-08-09）。
// 只精确到日期当天 00:00（Asia/Shanghai），不编造具体时分；
// 页面显示「从站点上线日期开始计算」，不写「精确上线于 00:00」。
// 若该值无效，页面会显示「上线时间待确认」，不会出现 NaN 或负数。
export const SITE_INFO = {
  launchedAt: "2026-08-09T00:00:00+08:00",
  timezone: "Asia/Shanghai",
  siteName: "沉积 Learning Hub",
  siteUrl: "https://chenji.felixfu.xyz",
};
