export function SiteFooter({ bare = false }: { bare?: boolean }) {
  return (
    <footer className={bare ? 'site-foot site-foot--bare' : 'site-foot'}>
      Samsung Leaders Club · PRISM
    </footer>
  );
}
