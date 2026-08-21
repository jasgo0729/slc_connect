export default async function MbtiResultPage({
  params,
}: PageProps<"/mbti/result/[id]">) {
  const { id } = await params;

  return (
    <main>
      <h1>MBTI 결과</h1>
      <p>결과 ID: {id}</p>
    </main>
  );
}
