const adminServices = require("./services/adminServices");
const bodyParser = require("body-parser");
const contractServices = require("./services/contractServices");
const express = require("express");
const jobServices = require("./services/jobServices");
const { getProfile } = require("./middleware/getProfile");
const profileServices = require('./services/profileServices');
const { sequelize } = require("./model");

const app = express();

app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

/**
 * @swagger
 * /admin/best-clients:
 *   get:
 *     summary: Retrieve a list of best clients within a given time range
 *     description: Retrieve a list of the clients who have spent the most money on jobs within a given time range, sorted by the total amount spent in descending order and limiting the list to a given limit.
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *         description: Start date for the time range (YYYY-MM-DD)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *         description: End date for the time range (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of clients to return
 *     responses:
 *       200:
 *         description: A list of best clients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Client ID
 *                   name:
 *                     type: string
 *                     description: Client name
 *                   type:
 *                     type: string
 *                     description: Profile type for client
 *                     example: 'client'
 *                   totalPayments:
 *                     type: number
 *                     description: Total amount spent by the client on jobs within the given time range
 *       500:
 *         description: An error occurred while processing the request
 */
app.get('/admin/best-clients',async (req,res) => {
  try {
    const { start, end, limit } = req.query;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const pLimit = parseInt(limit);

    const profesion = await adminServices.findBestClients(req.app,startDate,endDate,pLimit);

    res.json(profesion);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /admin/best-profession:
 *   get:
 *     summary: Retrieve the profession that was paid the most in a given date range.
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: start
 *         description: The start date of the date range.
 *         required: true
 *         type: string
 *         format: date-time
 *       - in: query
 *         name: end
 *         description: The end date of the date range.
 *         required: true
 *         type: string
 *         format: date-time
 *     responses:
 *       200:
 *         description: The best profession in the given date range.
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: The ID of the profession.
 *             name:
 *               type: string
 *               description: The name of the profession.
 *             totalPrice:
 *               type: number
 *               description: The total price of contracts associated with the profession.
 *       500:
 *         description: An error occurred while retrieving the best profession.
 */
app.get('/admin/best-profession',async (req,res) => {
  try {
    const { start, end } = req.query;

    const startDate = new Date(start);
    const endDate = new Date(end);

    const profesion = await adminServices.findBestProfession(req.app,startDate,endDate);

    res.json(profesion);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /balances/deposit/{userId}:
 *   post:
 *     summary: Deposits a specified amount to a specific user's account.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to deposit the amount to.
 *       - in: body
 *         name: deposit
 *         description: The amount to be deposited to the user's account.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             amount:
 *               type: number
 *               format: float
 *               example: 10.00
 *     responses:
 *       200:
 *         description: The user's profile with updated balance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 firstName:
 *                   type: string
 *                   example: John
 *                 lastName:
 *                   type: string
 *                   example: Doe
 *                 type:
 *                   type: string
 *                   example: client
 *                 balance:
 *                   type: number
 *                   format: float
 *                   example: 20.00
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: An error occurred while depositing the amount.
 */
app.post('/balances/deposit/:userId',async (req, res) =>{
  try {
      const {userId} = req.params;
      const { amount } = req.body;
      const pUserId = parseInt(userId);
      const pAmount = parseFloat(amount.toFixed(2));
      const profile = await profileServices.deposit(req.app,pUserId,pAmount);
      res.json(profile)
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
})

/**
 * @swagger
 * /contracts:
 *   get:
 *     summary: Retrieve all contracts for the authenticated user
 *     tags:
 *       - Contracts
 *     security:
 *       - profile_id
 *     responses:
 *       200:
 *         description: A list of contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contract'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
app.get("/contracts", getProfile, async (req, res) => {
  try {
    const profileId = req.profile.get("id");
    const contracts = await contractServices.findAll(req.app, profileId);
    res.json(contracts);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /contracts/{id}:
 *   get:
 *     summary: Get a contract by ID
 *     description: Retrieve a contract by its ID for the authenticated user
 *     tags: [Contracts]
 *     security:
 *       - profile_id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the contract to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The contract object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contract'
 *       404:
 *         description: Contract not found for the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Contract not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
app.get("/contracts/:id", getProfile, async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.get("id");
  try {
    const contract = await contractServices.getById(req.app, profileId, id);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    res.json(contract);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /jobs/{job_id}/pay:
 *   post:
 *     summary: Pay for a job
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the job to pay for
 *     security:
 *       - profile_id
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
app.post('/jobs/:job_id/pay',getProfile,async (req, res)=>{
  const { job_id } = req.params;
  try {
    const result = await jobServices.pay(req.app,req.profile,job_id);
    res.json(result);
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }    
});

/**
 * @swagger
 * /jobs/unpaid:
 *   get:
 *     summary: Get all unpaid jobs for the authenticated user
 *     description: Returns a list of all unpaid jobs that are associated with the authenticated user's profile
 *     security:
 *       - profile_id
 *     responses:
 *       200:
 *         description: A list of unpaid jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
app.get("/jobs/unpaid", getProfile, async (req, res) => {
  try {
    const profileId = req.profile.get("id");
    const jobs = await jobServices.retrieveAllUnpaid(req.app,profileId);
    res.json(jobs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = app;
