export default function Loading() {
  return (
    <main className="page-loading" aria-label="正在打开好友牌桌">
      <div className="page-loading__mark">HP</div>
      <div className="page-loading__copy"><strong>好友牌桌</strong><span>正在准备你的私密空间</span></div>
      <div className="page-loading__line" aria-hidden="true" />
    </main>
  );
}
