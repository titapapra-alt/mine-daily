import Link from "next/link";
import { PenLine } from "lucide-react";
export function EmptyState({ title = "A blank page is waiting", body = "There is no entry here yet. Begin with one honest sentence.", action = true }: { title?: string; body?: string; action?: boolean }) { return <section className="empty"><PenLine className="mx-auto mb-3" size={28} /><h2>{title}</h2><p className="mx-auto mt-2 max-w-md opacity-70">{body}</p>{action && <Link className="button button-quiet compact-action mt-5" href="/diary/new"><PenLine size={17} />Write today</Link>}</section>; }
