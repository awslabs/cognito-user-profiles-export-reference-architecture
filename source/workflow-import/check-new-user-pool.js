// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

const { getOptions } = require('../utils/metrics');

const AWS = require('aws-sdk');
const cognitoISP = new AWS.CognitoIdentityServiceProvider(getOptions());
const { sleep } = require('../utils/helper-functions');

/**
 * Checks the new user pool to ensure it has no users or groups
 * @param {object} event 
 */
exports.handler = async (event) => {
    console.log(`Received event: ${JSON.stringify(event, null, 2)}`);
    const result = { NewUserPoolEmpty: true };
    let newUserPoolId;
    try {
        const { Context } = event;
        newUserPoolId = Context.Execution.Input.NewUserPoolId.trim();
        if (!newUserPoolId) {
            throw new Error('Unable to determine the new user pool ID');
        }
    } catch (err) {
        console.error(err);
        throw new Error('Unable to determine the new user pool ID');
    }

    try {
        const listUsersParams = { UserPoolId: newUserPoolId };
        console.log(`Listing users in new pool: ${JSON.stringify(listUsersParams)}`);
        const listUsersResponse = await cognitoISP.listUsers(listUsersParams).promise();

        if (listUsersResponse.Users && listUsersResponse.Users.length > 0) {
            throw new Error(`Found at least ${listUsersResponse.Users.length} user(s) in the new user pool`);
        }

        await sleep(1);

        const listGroupsParams = { UserPoolId: newUserPoolId };
        console.log(`Listing groups in new pool: ${JSON.stringify(listGroupsParams)}`);
        const listGroupsResponse = await cognitoISP.listGroups(listGroupsParams).promise();

        if (listGroupsResponse.Groups && listGroupsResponse.Groups.length > 0) {
            throw new Error(`Found at least ${listGroupsResponse.Groups.length} group(s) in the new user pool`);
        }
    } catch (err) {
        console.error(err);
        result.NewUserPoolEmpty = false;
    }

    console.log(`result: ${JSON.stringify(result)}`);
    return { result: result };
};
