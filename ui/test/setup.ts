import '@testing-library/jest-dom';

// Silence console noise during tests if desired
// const origError = console.error;
// beforeAll(() => {
//   console.error = (...args: any[]) => {
//     if (String(args?.[0] || '').includes('Warning:')) return;
//     origError(...args);
//   };
// });
// afterAll(() => {
//   console.error = origError;
// });