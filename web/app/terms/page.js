'use client';

import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="login-page" style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '40px 20px' }}>
      <div className="card card-padding" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', background: 'var(--bg-card)' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Kembali
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
            <FileText size={32} />
          </div>
          <h1>Terms and Conditions</h1>
          <p className="text-secondary">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="prose" style={{ lineHeight: '1.7' }}>
          <h3>1. Penerimaan Syarat</h3>
          <p>
            Dengan mengakses dan menggunakan SuperApp ("Aplikasi"), Anda menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun dari syarat ini, Anda dilarang menggunakan Aplikasi.
          </p>

          <h3>2. Penggunaan Aplikasi</h3>
          <p>
            SuperApp disediakan sebagai alat manajemen pribadi untuk melacak produktivitas, tugas, dan kebiasaan. Anda bertanggung jawab untuk menjaga kerahasiaan "Kode Unik" atau "Sync ID" Anda untuk mencegah akses tidak sah ke data Anda.
          </p>

          <h3>3. Penyimpanan & Kehilangan Data</h3>
          <ul>
            <li>Aplikasi ini pada dasarnya beroperasi secara offline menggunakan penyimpanan browser lokal Anda.</li>
            <li>Membersihkan data situs, cookie, atau menghapus instalasi browser dapat menyebabkan hilangnya data permanen jika Anda belum menggunakan fitur Ekspor (Backup) atau Cloud Sync.</li>
            <li>Kami tidak bertanggung jawab atas hilangnya data yang disebabkan oleh tindakan pengguna atau kerusakan perangkat lunak peramban.</li>
          </ul>

          <h3>4. Premium Store & Pembelian</h3>
          <p>
            Semua pembelian Token Premium bersifat final. Pembayaran diproses dengan aman melalui Midtrans. Token tidak dapat ditukar menjadi uang tunai.
          </p>

          <h3>5. Tanggung Jawab Pengguna</h3>
          <p>
            Anda setuju untuk tidak menggunakan layanan Cloud Sync untuk mengunggah materi yang melanggar hukum, berbahaya, atau memuat konten berbahaya yang dapat mengganggu server kami.
          </p>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <p>&copy; {new Date().getFullYear()} SuperApp Personal Management. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
