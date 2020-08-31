// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

// Mock AWS SDK
const mockSns = {
    publish: jest.fn()
};

const mockDocClient = {
    put: jest.fn()
};

jest.mock('aws-sdk', () => {
    return {
        SNS: jest.fn(() => ({
            publish: mockSns.publish
        })),
        DynamoDB: {
            DocumentClient: jest.fn(() => ({
                put: mockDocClient.put
            }))
        }
    };
});

// Mock metrics client
const Metrics = require('../../utils/metrics');
jest.mock('../../utils/metrics');

beforeAll(() => {
    process.env = Object.assign(process.env, {
        SEND_METRIC: 'Yes',
        METRICS_ANONYMOUS_UUID: 'uuid',
        SOLUTION_ID: 'SOMock',
        SOLUTION_VERSION: 'v1.0.0',
        AWS_REGION: 'us-east-1',
        IS_SECONDARY_REGION: 'No',
        NOTIFICATION_TOPIC: 'topic-arn',
        SNS_MESSAGE_PREFERENCE: 'INFO_AND_ERRORS',
        BACKUP_TABLE_NAME: 'table-name',
        TYPE_TIMESTAMP: 'timestamp-type'
    });
});

describe('workflow-message-broker', function () {
    beforeEach(() => {
        jest.resetModules();
        for (const mockFn in mockSns) {
            mockSns[mockFn].mockReset();
        }

        for (const mockFn in mockDocClient) {
            mockDocClient[mockFn].mockReset();
        }
    });

    it('Handles an error and publishes to SNS', async function () {
        mockSns.publish.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        Metrics.sendAnonymousMetric.mockImplementationOnce(async (x, y, z) => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        const errorCause = { message: 'error-message' };
        const event = {
            Context: {
                Execution: { StartTime: new Date(0).toISOString() },
                StateMachine: { Id: 'id', StartTime: new Date(), Name: 'StateMachineName' },
                State: { Name: 'WorkflowErrorHandlerLambda' }
            },
            Input: { Error: 'Error', Cause: JSON.stringify(errorCause) }
        };
        const lambda = require('../message-broker');
        await lambda.handler(event);

        expect(mockSns.publish.mock.calls[0][0]).toEqual({
            TopicArn: 'topic-arn',
            Message: `An unexpected error occurred while executing the StateMachineName for this solution:\n${JSON.stringify(errorCause, null, 2)}\n\nPlease check the state machine's task logs for additional information\n\nExecution details:\n${JSON.stringify(event.Context, null, 2)}`
        });
    });

    it('Handles a cleanup request and publishes to SNS', async function () {
        mockSns.publish.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        mockDocClient.put.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        Metrics.sendAnonymousMetric.mockImplementationOnce(async (x, y, z) => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        const event = {
            Context: {
                Execution: { StartTime: new Date(0).toISOString() },
                StateMachine: { Id: 'id', StartTime: new Date(), Name: 'ExportWorkflow-HASH' },
                State: { Name: 'WorkflowCleanupLambda', EnteredTime: new Date(1000).toISOString() }
            },
            Input: { ExportTimestamp: new Date().getTime() }
        };
        const lambda = require('../message-broker');
        await lambda.handler(event);

        expect(mockSns.publish.mock.calls[0][0]).toEqual({
            TopicArn: 'topic-arn',
            Message: `Workflow (ExportWorkflow-HASH) completed successfully. Execution took 1 second(s).\n\nExecution details:\n${JSON.stringify(event.Context, null, 2)}`
        });

        expect(mockDocClient.put.mock.calls[0][0]).toEqual({
            TableName: 'table-name',
            Item: {
                id: 'latest-export-timestamp',
                type: 'timestamp-type',
                latestExportTimestamp: event.Input.ExportTimestamp    
            }
        });
    });

    it('NOOP for unknown state name', async function () {
        const event = {
            Context: {
                Execution: { StartTime: new Date(0).toISOString() },
                StateMachine: { Id: 'id', StartTime: new Date(), Name: 'StateMachineName' },
                State: { Name: 'UNKNOWN', EnteredTime: new Date(1000).toISOString() }
            },
            Input: {}
        };
        const lambda = require('../message-broker');
        await lambda.handler(event);
    });

    it('Handles an error and publishes to SNS when an error object is not passed', async function () {
        mockSns.publish.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        Metrics.sendAnonymousMetric.mockImplementationOnce(async (x, y, z) => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        const event = {
            Context: {
                Execution: { StartTime: new Date(0).toISOString() },
                StateMachine: { Id: 'id', StartTime: new Date(), Name: 'StateMachineName' },
                State: { Name: 'WorkflowErrorHandlerLambda' }
            },
            Input: {}
        };
        const lambda = require('../message-broker');
        await lambda.handler(event);

        expect(mockSns.publish.mock.calls[0][0]).toEqual({
            TopicArn: 'topic-arn',
            Message: `An unexpected error occurred while executing the StateMachineName for this solution:\n"Unknown"\n\nPlease check the state machine's task logs for additional information\n\nExecution details:\n${JSON.stringify(event.Context, null, 2)}`
        });
    });

    it('Handles an error and publishes to SNS when a string is passed as the error cause', async function () {
        mockSns.publish.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        Metrics.sendAnonymousMetric.mockImplementationOnce(async (x, y, z) => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        const event = {
            Context: {
                Execution: { StartTime: new Date(0).toISOString() },
                StateMachine: { Id: 'id', StartTime: new Date(), Name: 'StateMachineName' },
                State: { Name: 'WorkflowErrorHandlerLambda' }
            },
            Input: { Error: 'Error', Cause: 'some-error-cause' }
        };
        const lambda = require('../message-broker');
        await lambda.handler(event);

        expect(mockSns.publish.mock.calls[0][0]).toEqual({
            TopicArn: 'topic-arn',
            Message: `An unexpected error occurred while executing the StateMachineName for this solution:\n"some-error-cause"\n\nPlease check the state machine's task logs for additional information\n\nExecution details:\n${JSON.stringify(event.Context, null, 2)}`
        });
    });
});