import Link from "next/link";
export default function NotFound() { return <section className="page-sheet glass"><h1 className="section-title">This page drifted away.</h1><p className="mt-3 opacity-70">It may have been moved or no longer exists.</p><Link className="button button-dark mt-6" href="/diary">Return to daily</Link></section>; }
