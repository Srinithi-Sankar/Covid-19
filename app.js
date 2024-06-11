const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const databasePath = path.join(__dirname, 'covid19India.db')
const app = express()
app.use(express.json())
let database = null

const reportSnakeToCamelCase = (newObject) => {
    return{
        totalCases: newObject.cases,
        totalCured: newObject.cured,
        totalActive: newObject.active,
        totalDeaths: newObject.deaths,
    };
};
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)

    process.exit(1)
  }
}

initializeDbAndServer()

const convertStateObjectToResponseObject = dbobject => {
  return {
    stateId: dbobject.state_id,
    stateName: dbobject.state_name,
    population: dbobject.population,
  }
}

const convertDistrictObjectToResponseObject = dbobject => {
  return {
    districtId: dbobject.district_id,
    districtName: dbobject.district_name,
    stateId: dbobject.state_id,
    cases: dbobject.cases,
    cured: dbobject.cured,
    active: dbobject.active,
    deaths: dbobject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const getStateQuery = `
    SELECT
    *
    FROM
    state
    ORDER BY
    state_id;`

  const stateArray = await database.all(getStateQuery)
  response.send(
    stateArray.map(eachState => convertStateObjectToResponseObject(eachState)),
  )
})

app.get('/states/:stateId', async (request, response) => {
  const {stateId} = request.params

  const getStateQuery = `
    SELECT
    *
    FROM
    state
    WHERE
    state_id = ${stateId};`

  const state = await database.get(getStateQuery)
  response.send(convertStateObjectToResponseObject(state))
})

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const postDistrictQuery = `
    INSERT INTO
    district( district_name, state_id, cases, cured, active, deaths )
    VALUES
    ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`
  await database.run(postDistrictQuery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const getDistrictQuery = `
    SELECT 
    *
    FROM
    district
    WHERE
    district_id = ${districtId};`

  const district = await database.get(getDistrictQuery)
  response.send(convertDistrictObjectToResponseObject(district))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const deleteDistrictQuery = `
    DELETE
    FROM 
    district 
    WHERE
    district_id = ${districtId};`

  await database.run(deleteDistrictQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `
    UPDATE 
    district
    SET 
    district_name ='${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE 
    district_id =${districtId};`

  await database.run(updateDistrictQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params

  const getDistrictStateQuery = `

    SELECT SUM(cases) AS cases,
    SUM(cured) AS cured,
    SUM(active) AS active,
    SUM(deaths) AS deaths
    
    FROM district

    WHERE state_id = ${stateId};`

  const stateArray = await database.get(getDistrictStateQuery)
  const resultReport=reportSnakeToCamelCase(stateArray);

  response.send(resultReport);
});

app.get('/districts/:districtId/details/', async (request, response) => {
    const {districtId } = request.params;
    const stateDetails=`
    SELECT state_name 
    FROM state JOIN district
    ON state.state_id = district.state_id
    WHERE district.district_id=${districtId};`;
    const stateName = await database.get(stateDetails);
    response.send({ stateName: stateName.state_name});
  
});

module.exports = app
