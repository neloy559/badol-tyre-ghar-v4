'use strict';

const express = require('express');
const campaignController = require('./campaign.controller');

const router = express.Router();

router.get('/', campaignController.getCampaigns);
router.post('/', campaignController.createCampaign);
router.patch('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;
