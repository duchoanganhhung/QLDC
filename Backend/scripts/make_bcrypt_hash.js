const bcrypt = require('bcryptjs');


(async () => {
  const plain = process.argv[2] || 'admin123';
  const hash = await bcrypt.hash(plain, 10);
  console.log(`Plain: ${plain}`);
  console.log(`Hash : ${hash}`);
})();
