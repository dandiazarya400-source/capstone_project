// app/test/page.tsx
export default function TestPage() {
  console.log("Halaman Test dirender!");
  return (
    // Tambahkan style backgroundColor
    <div style={{ padding: '20px', backgroundColor: 'black', minHeight: '100vh' }}>
      <h1 style={{ color: 'white' }}>Halo, ini halaman tes!</h1>
    </div>
  );
}