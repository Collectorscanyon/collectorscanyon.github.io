export function getEnv(key) {
  return (
    process.env[key] ||
    process.env[`REACT_APP_${key}`] ||
    process.env[`VITE_${key}`] ||
    ''
  );
}
