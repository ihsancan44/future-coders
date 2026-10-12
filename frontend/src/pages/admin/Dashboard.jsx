import PropTypes from "prop-types";
import { Card, Table, Tag } from "antd";
import { ErrorState, Loading } from "../../components/Status";
import { useApi } from "../../hooks/useApi";
import { LEVEL_COLOR, LEVEL_LABEL } from "../../utils/format";

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}
Stat.propTypes = { label: PropTypes.string, value: PropTypes.node, sub: PropTypes.string };

function Bars({ rows, labelKey, valueKey, color = "var(--brand)" }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r[labelKey]}>
          <span className="bars__label">{r[labelKey]}</span>
          <span className="bars__track"><span className="bars__fill" style={{ width: `${(r[valueKey] / max) * 100}%`, background: color }} /></span>
          <span className="bars__value">{r[valueKey]}</span>
        </li>
      ))}
    </ul>
  );
}
Bars.propTypes = { rows: PropTypes.array.isRequired, labelKey: PropTypes.string, valueKey: PropTypes.string, color: PropTypes.string };

export default function Dashboard() {
  const { data, error, loading, reload } = useApi("/admin/stats");
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const { totals, levels, schools, placementScores, registrations, courses } = data;
  const placed = levels.ALPHA + levels.BETA;
  const maxReg = Math.max(1, ...registrations.map((r) => r.count));

  return (
    <div className="admin-page">
      <h1>İstatistikler</h1>
      <div className="stats-grid">
        <Stat label="Kurs sayısı" value={totals.courses} sub={`${totals.publishedCourses} yayında`} />
        <Stat label="Blog sayısı" value={totals.blogPosts} sub={`${totals.publishedBlogPosts} yayında`} />
        <Stat label="Öğrenci sayısı" value={totals.students} sub={`${levels.NONE} kişi sınava girmedi`} />
        <Stat label="Alpha / Beta" value={`${levels.ALPHA} / ${levels.BETA}`} sub={placed ? `%${Math.round((levels.BETA / placed) * 100)} Beta` : "Henüz yerleşen yok"} />
      </div>

      <div className="admin-grid">
        <Card title="Sınıf dağılımı">
          <Bars
            rows={[
              { label: "Alpha", count: levels.ALPHA },
              { label: "Beta", count: levels.BETA },
              { label: "Sınava girmedi", count: levels.NONE },
            ]}
            labelKey="label"
            valueKey="count"
          />
        </Card>
        <Card title="Seviye sınavı puanları">
          <Bars rows={placementScores} labelKey="range" valueKey="count" color="var(--accent)" />
        </Card>
        <Card title="Okullara göre öğrenciler">
          {schools.length ? <Bars rows={schools} labelKey="school" valueKey="count" color="var(--accent)" /> : <p className="muted">Henüz öğrenci yok.</p>}
        </Card>
        <Card title="Son 30 gün kayıtlar">
          <div className="spark" role="img" aria-label={`Son 30 günde ${registrations.reduce((s, r) => s + r.count, 0)} kayıt`}>
            {registrations.map((r) => (
              <span key={r.date} title={`${r.date}: ${r.count}`} style={{ height: `${Math.max(4, (r.count / maxReg) * 100)}%` }} className={r.count ? "" : "is-zero"} />
            ))}
          </div>
          <p className="muted small">Toplam {registrations.reduce((s, r) => s + r.count, 0)} yeni öğrenci</p>
        </Card>
      </div>

      <Card title="Kurs bazında">
        <Table
          rowKey="id"
          size="small"
          dataSource={courses}
          pagination={false}
          scroll={{ x: true }}
          columns={[
            { title: "Kurs", dataIndex: "title" },
            { title: "Sınıf", dataIndex: "level", render: (l) => <Tag color={LEVEL_COLOR[l]}>{LEVEL_LABEL[l]}</Tag> },
            { title: "Durum", dataIndex: "published", render: (p) => (p ? <Tag color="green">Yayında</Tag> : <Tag>Gizli</Tag>) },
            { title: "Ders", dataIndex: "lessons", align: "right" },
            { title: "Öğrenci", dataIndex: "learners", align: "right" },
            { title: "Yorum", dataIndex: "comments", align: "right" },
            { title: "Final denemesi", dataIndex: "finalAttempts", align: "right" },
            { title: "Finali geçen", dataIndex: "finalPassed", align: "right" },
          ]}
        />
      </Card>
    </div>
  );
}
