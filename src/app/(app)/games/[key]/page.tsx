export default async function GamePage({ params }: PageProps<"/games/[key]">) {
  const { key } = await params;

  return (
    <main>
      <h1>게임</h1>
      <p>게임 키: {key}</p>
    </main>
  );
}
