import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>
            Kuch galat ho gaya
          </h1>
          <p style={{ color: "#666", marginBottom: "16px" }}>
            Is page mein ek error aa gayi. Please dobara try karein.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#D96C52",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Home par wapas jaayein
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
