export default async function InvitePreviewPage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;

  return (
    <main>
      <h1>초대 링크 미리보기</h1>
      <p>초대 토큰: {token}</p>
    </main>
  );
}
