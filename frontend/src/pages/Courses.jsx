import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Input, Segmented, Select } from "antd";
import PageBanner from "../components/PageBanner";
import CourseCard from "../components/CourseCard";
import { ErrorState, Loading } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

export default function Courses() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState();
  const [searchParams] = useSearchParams();
  // Sınıfı belli öğrenci varsayılan olarak sadece kendine açık kursları görür; diğerlerini filtreyle (kilitli) görebilir.
  const [chosenLevel, setLevel] = useState(searchParams.get("mine") === "true" ? "MINE" : null);
  const level = chosenLevel ?? (user?.level && user.role !== "ADMIN" ? "MINE" : "ALL_LEVELS");
  const [sort, setSort] = useState("new");

  const params = {
    search: query || undefined,
    category,
    sort,
    ...(level === "MINE" ? { mine: "true" } : level !== "ALL_LEVELS" ? { level } : {}),
  };
  const { data, error, loading, reload } = useApi("/courses", params);

  const levelOptions = [
    { label: "Tümü", value: "ALL_LEVELS" },
    ...(user?.level ? [{ label: "Bana açık olanlar", value: "MINE" }] : []),
    { label: "Alpha", value: "ALPHA" },
    { label: "Beta", value: "BETA" },
    { label: "Herkese açık", value: "ALL" },
  ];

  return (
    <>
      <PageBanner title="Kurslar" />
      <section className="section">
        <div className="filters">
          <Input.Search
            placeholder="Kurs ara"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(v) => setQuery(v.trim())}
            className="filters__search"
          />
          <Select
            placeholder="Kategori"
            aria-label="Kategori"
            allowClear
            value={category}
            onChange={setCategory}
            options={(data?.categories || []).map((c) => ({ value: c, label: c }))}
            className="filters__select"
          />
          <Select
            value={sort}
            onChange={setSort}
            aria-label="Sıralama"
            options={[{ value: "new", label: "En yeni" }, { value: "popular", label: "En popüler" }]}
            className="filters__select"
          />
          <Segmented options={levelOptions} value={level} onChange={setLevel} />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : data.courses.length ? (
          <div className="card-grid">{data.courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        ) : (
          <p className="muted center">Aramanıza uygun kurs bulunamadı.</p>
        )}
      </section>
    </>
  );
}
