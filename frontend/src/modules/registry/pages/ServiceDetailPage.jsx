import { useEffect, useState } from "react";

import { fetchRegistryService, fetchRegistryServices, testRegistryService } from "../api/registryApi";

function serviceIdFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

export default function ServiceDetailPage() {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadService() {
      setLoading(true);
      setError("");

      try {
        let serviceId = serviceIdFromLocation();
        if (!serviceId) {
          const services = await fetchRegistryServices();
          serviceId = services[0]?.id;
        }

        if (!serviceId) {
          setService(null);
          return;
        }

        const detail = await fetchRegistryService(serviceId);
        setService(detail);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, []);

  async function handleRetest() {
    if (!service) {
      return;
    }

    setTesting(true);
    setError("");

    try {
      const updatedService = await testRegistryService(service.id);
      setService(updatedService);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <div className="page-header detail-header-row">
        <div>
          <h1 className="page-title">Service Detail</h1>
          <p className="page-subtitle">
            Inspect one registry connection, review its latest prompt-based check, and rerun the connection test.
          </p>
        </div>
        {service ? (
          <button className={`btn ${service.status === "error" ? "btn-danger" : "btn-primary"}`} type="button" onClick={handleRetest} disabled={testing}>
            {testing ? "Testing..." : "Retest Connection"}
          </button>
        ) : null}
      </div>

      {error ? <div className="registry-banner error">{error}</div> : null}
      {loading ? <div className="registry-banner">Loading service detail...</div> : null}

      {!loading && !service ? <div className="registry-banner">No registry service selected.</div> : null}

      {service ? (
        <div className="panel-grid two-column-grid">
          <div className="card detail-card">
            <h2 className="section-title">Service Inspector</h2>
            <div className="info-list">
              <div><strong>Name:</strong> {service.name}</div>
              <div><strong>ID:</strong> {service.id}</div>
              <div><strong>Owner:</strong> {service.owner}</div>
              <div><strong>Environment:</strong> {service.environment}</div>
              <div><strong>Model:</strong> {service.model_name}</div>
              <div><strong>Sensitivity:</strong> {service.sensitivity}</div>
              <div><strong>Provider:</strong> {service.provider}</div>
            </div>
          </div>

          <div className="card detail-card">
            <h2 className="section-title">Latest Test Result</h2>
            <div className="info-list">
              <div><strong>Status:</strong> {service.last_test?.success ? "Success" : "Fail"}</div>
              <div><strong>Latency:</strong> {service.last_test?.latency_ms ?? "-"} ms</div>
              <div><strong>Tested At:</strong> {service.last_test?.tested_at ?? "Not tested"}</div>
              <div><strong>Prompt:</strong> {service.last_test?.prompt ?? "-"}</div>
              <div><strong>Detail:</strong> {service.last_test?.detail ?? "-"}</div>
              <div><strong>Response Preview:</strong> {service.last_test?.response_preview || "No response preview"}</div>
            </div>
          </div>

          <div className="card detail-card detail-card-wide">
            <h2 className="section-title">Test History</h2>
            <div className="test-history-list">
              {service.test_history?.map((item) => (
                <div className="test-history-item" key={`${item.tested_at}-${item.detail}`}>
                  <div className="service-meta-row">
                    <span className={`status-dot ${item.success ? "online" : "error"}`} />
                    <strong>{item.success ? "Success" : "Fail"}</strong>
                    <span className="mono-text">{item.latency_ms ?? "-"} ms</span>
                  </div>
                  <div className="list-card-meta">{item.tested_at}</div>
                  <div>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}