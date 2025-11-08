const express = require('express');
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Canvas Running On Server!')
})

app.listen(port, () => {
  console.log(`Canvas Server started on port ${port}`)
})