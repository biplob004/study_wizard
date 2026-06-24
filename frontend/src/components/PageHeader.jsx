// Consistent page heading used at the top of every screen.
export default function PageHeader({ emoji, title, subtitle, align = "center" }) {
  const alignment = align === "left" ? "text-left" : "text-center";
  return (
    <header className={`mb-7 ${alignment}`}>
      {emoji && <div className="mb-2 text-5xl">{emoji}</div>}
      <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </header>
  );
}
