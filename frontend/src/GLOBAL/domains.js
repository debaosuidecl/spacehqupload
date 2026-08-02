//@ts-nocheck
import React, { Component } from "react";

class GLOBAL extends Component {
  static domain =
    process.env.NODE_ENV === "production"
      ? "https://update.shea.biz"
      : "http://localhost:5000";

  render() {
    return;
  }
}

export default GLOBAL;
