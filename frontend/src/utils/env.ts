export const env = {
  apiUrl:
    import.meta.env.REACT_APP_API_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/",
  appName:
    import.meta.env.REACT_APP_APP_NAME ||
    import.meta.env.VITE_APP_NAME ||
    "StockManager",
  razorpayKeyId:
    import.meta.env.REACT_APP_RAZORPAY_KEY_ID ||
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    "",
};
