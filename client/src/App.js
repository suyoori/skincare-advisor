import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

function App() {
  const [step, setStep] = useState("form"); // form | loading | result
  const [form, setForm] = useState({
    age: "",
    skinType: "",
    recentChanges: "",
    skinConcerns: "",
  });
  const [result, setResult] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (
      !form.age ||
      !form.skinType ||
      !form.recentChanges ||
      !form.skinConcerns
    ) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    setError("");
    setStep("loading");

    try {
      const res = await axios.post(`${API_URL}/api/recommend`, form);
      setResult(res.data.recommendation);
      setReviews(res.data.reviews);
      setStep("result");
    } catch (err) {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
      setStep("form");
    }
  };

  const handleReset = () => {
    setStep("form");
    setResult(null);
    setReviews([]);
    setForm({ age: "", skinType: "", recentChanges: "", skinConcerns: "" });
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">AI 스킨케어 어드바이저</h1>
        <p className="subtitle">탐색 없이 확신하고 구매하세요</p>
      </div>

      {step === "form" && (
        <div className="card">
          <p className="card-desc">
            3분 안에 입력하면 AI가 내 피부에 맞는 제품을 찾아드립니다.
          </p>

          <div className="form-group">
            <label>나이</label>
            <input
              type="number"
              name="age"
              min={1}
              placeholder="예: 44"
              value={form.age}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>피부 타입</label>
            <select
              name="skinType"
              value={form.skinType}
              onChange={handleChange}
            >
              <option value="">선택해주세요</option>
              <option value="건성">건성</option>
              <option value="지성">지성</option>
              <option value="복합성">복합성</option>
              <option value="민감성">민감성</option>
              <option value="중성">중성</option>
            </select>
          </div>

          <div className="form-group">
            <label>최근 피부 변화</label>
            <input
              type="text"
              name="recentChanges"
              placeholder="예: 갑자기 건조해짐, 탄력이 떨어짐"
              value={form.recentChanges}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>주요 피부 고민</label>
            <textarea
              name="skinConcerns"
              placeholder="예: 모공, 주름, 색소침착, 수분 부족"
              value={form.skinConcerns}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn-primary" onClick={handleSubmit}>
            AI 분석 시작하기
          </button>
        </div>
      )}

      {step === "loading" && (
        <div className="card center">
          <div className="spinner" />
          <p className="loading-text">AI가 피부 상태를 분석하고 있습니다...</p>
          <p className="loading-sub">유사 연령대 리뷰를 필터링하는 중</p>
        </div>
      )}

      {step === "result" && (
        <div>
          <div className="card">
            <h2 className="section-title">AI 분석 결과</h2>
            <div className="result-text">
              {result.split("\n").map((line, i) => (
                <p
                  key={i}
                  className={
                    line.match(/^\d\./) ? "result-heading" : "result-body"
                  }
                >
                  {line}
                </p>
              ))}
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="card">
              <h2 className="section-title">유사 연령대 실사용 후기</h2>
              <p className="card-desc">
                광고 없이 동일 연령대 리뷰만 필터링했습니다.
              </p>
              {reviews.map((review, i) => (
                <div key={i} className="review-item">
                  <div className="review-meta">
                    <span className="review-tag">{review.age}</span>
                    <span className="review-tag">{review.skinType}</span>
                    <span className="review-rating">★ {review.rating}</span>
                  </div>
                  <p className="review-text">{review.text}</p>
                </div>
              ))}
            </div>
          )}

          <button className="btn-secondary" onClick={handleReset}>
            다시 분석하기
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
