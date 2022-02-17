import { PropertyType } from '@medplum/core';
import {
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  QuestionnaireResponseItemAnswer,
} from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { randomUUID } from 'crypto';
import each from 'jest-each';
import React from 'react';
import { MedplumProvider } from './MedplumProvider';
import { QuestionnaireForm, QuestionnaireFormProps } from './QuestionnaireForm';
import { QuestionnaireItemType } from './QuestionnaireUtils';

const medplum = new MockClient();

async function setup(args: QuestionnaireFormProps): Promise<void> {
  await act(async () => {
    render(
      <MedplumProvider medplum={medplum}>
        <QuestionnaireForm {...args} />
      </MedplumProvider>
    );
  });
}

describe('QuestionnaireForm', () => {
  test('Renders empty', async () => {
    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
      },
      onSubmit: jest.fn(),
    });
    expect(screen.getByTestId('questionnaire-form')).toBeInTheDocument();
  });

  test('Groups', async () => {
    const onSubmit = jest.fn();

    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'group1',
            text: 'Group 1',
            type: QuestionnaireItemType.group,
            item: [
              {
                linkId: 'question1',
                text: 'Question 1',
                type: QuestionnaireItemType.string,
              },
              {
                linkId: 'question2',
                text: 'Question 2',
                type: QuestionnaireItemType.string,
              },
            ],
          },
          {
            linkId: 'group2',
            text: 'Group 2',
            type: QuestionnaireItemType.group,
            item: [
              {
                linkId: 'question3',
                text: 'Question 3',
                type: QuestionnaireItemType.string,
              },
              {
                linkId: 'question4',
                text: 'Question 4',
                type: QuestionnaireItemType.string,
              },
            ],
          },
        ],
      },
      onSubmit,
    });

    expect(screen.getByTestId('questionnaire-form')).toBeInTheDocument();
    expect(screen.getByText('Group 1')).toBeDefined();
    expect(screen.getByText('Group 2')).toBeDefined();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Question 1'), { target: { value: 'a1' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Question 2'), { target: { value: 'a2' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Question 3'), { target: { value: 'a3' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Question 4'), { target: { value: 'a4' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    expect(onSubmit).toBeCalled();

    const response = onSubmit.mock.calls[0][0];
    expect(getAnswer(response, 'question1')).toMatchObject({ valueString: 'a1' });
    expect(getAnswer(response, 'question2')).toMatchObject({ valueString: 'a2' });
    expect(getAnswer(response, 'question3')).toMatchObject({ valueString: 'a3' });
    expect(getAnswer(response, 'question4')).toMatchObject({ valueString: 'a4' });
  });

  test('Handles submit', async () => {
    const onSubmit = jest.fn();

    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'q1',
            type: QuestionnaireItemType.string,
            text: 'q1',
          },
          {
            linkId: 'q2',
            type: QuestionnaireItemType.integer,
            text: 'q2',
          },
          {
            linkId: 'q3',
            type: QuestionnaireItemType.date,
            text: 'q3',
          },
          {
            linkId: '', // Silently ignore missing linkId
            type: QuestionnaireItemType.string,
            text: 'q4',
          },
          {
            linkId: 'q5',
            type: '', // Silently ignore missing type
            text: 'q5',
          },
          {
            linkId: 'q6',
            type: QuestionnaireItemType.string,
            text: 'q6',
            initial: [
              {
                valueString: 'initial answer',
              },
            ],
          },
        ],
      },
      onSubmit,
    });

    expect(screen.getByTestId('questionnaire-form')).toBeInTheDocument();
    expect(screen.queryByLabelText('q4')).toBeFalsy();
    expect(screen.queryByLabelText('q5')).toBeFalsy();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('q1'), { target: { value: 'a1' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('q2'), { target: { value: '2' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('q3'), { target: { value: '2023-03-03' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    expect(onSubmit).toBeCalled();

    const response = onSubmit.mock.calls[0][0];
    expect(getAnswer(response, 'q1')).toMatchObject({ valueString: 'a1' });
    expect(getAnswer(response, 'q2')).toMatchObject({ valueInteger: 2 });
    expect(getAnswer(response, 'q3')).toMatchObject({ valueDate: '2023-03-03' });
    expect(getAnswer(response, 'q6')).toMatchObject({ valueString: 'initial answer' });
  });

  each([
    [QuestionnaireItemType.decimal, 'number', '123.456'],
    [QuestionnaireItemType.integer, 'number', '123'],
    [QuestionnaireItemType.date, 'date', '2020-01-01'],
    [QuestionnaireItemType.dateTime, 'datetime-local', '2020-01-01T12:01:01.000'],
    [QuestionnaireItemType.time, 'time', '12:01:01'],
    [QuestionnaireItemType.string, 'text', 'hello'],
    [QuestionnaireItemType.text, 'textarea', 'lorem ipsum'],
    [QuestionnaireItemType.url, 'url', 'https://example.com/'],
    [QuestionnaireItemType.quantity, 'number', '123'],
  ]).test('%s question', async (propertyType: PropertyType, inputType: string, value: string) => {
    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'q1',
            type: propertyType,
            text: 'q1',
          },
        ],
      },
      onSubmit: jest.fn(),
    });

    const input = screen.getByLabelText('q1') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    if (inputType !== 'date' && inputType !== 'datetime-local') {
      // JSDOM does not support date or datetime-local
      expect(input.type).toEqual(inputType);
    }

    await act(async () => {
      fireEvent.change(input, { target: { value } });
    });

    expect(input.value).toBe(value);
  });

  test('Boolean input', async () => {
    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'q1',
            type: QuestionnaireItemType.boolean,
            text: 'q1',
          },
        ],
      },
      onSubmit: jest.fn(),
    });

    const input = screen.getByLabelText('q1') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(input);
    });

    expect(input.checked).toBe(true);
  });

  test('Choice input', async () => {
    const onSubmit = jest.fn();

    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'q1',
            type: QuestionnaireItemType.choice,
            text: 'q1',
            answerOption: [
              {
                valueString: 'a1',
              },
              {
                valueString: 'a2',
              },
            ],
          },
        ],
      },
      onSubmit,
    });

    expect(screen.getByText('q1')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByText('a2')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByLabelText('a1'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    const response1 = onSubmit.mock.calls[0][0];
    expect(getAnswer(response1, 'q1')).toMatchObject({ valueString: 'a1' });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('a2'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    const response2 = onSubmit.mock.calls[1][0];
    expect(getAnswer(response2, 'q1')).toMatchObject({ valueString: 'a2' });
  });

  test('Open choice input', async () => {
    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'q1',
            type: QuestionnaireItemType.openChoice,
            text: 'q1',
            answerOption: [
              {
                valueString: 'a1',
              },
              {
                valueString: 'a2',
              },
            ],
          },
        ],
      },
      onSubmit: jest.fn(),
    });

    expect(screen.getByText('q1')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByText('a2')).toBeInTheDocument();
  });

  test('Attachment input', async () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      id: randomUUID(),
      item: [
        {
          linkId: 'q1',
          type: QuestionnaireItemType.attachment,
          text: 'q1',
        },
      ],
    };

    const expectedResponse: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      questionnaire: 'Questionnaire/' + questionnaire.id,
      source: {
        reference: 'Practitioner/123',
      },
      item: [
        {
          linkId: 'q1',
          answer: [
            {
              valueAttachment: {
                title: 'hello.txt',
                contentType: 'text/plain',
                url: 'https://example.com/binary/123',
              },
            },
          ],
        },
      ],
    };

    const onSubmit = jest.fn();

    await setup({ questionnaire, onSubmit });

    const input = screen.getByText('Upload...');
    expect(input).toBeInTheDocument();

    await act(async () => {
      const files = [new File(['hello'], 'hello.txt', { type: 'text/plain' })];
      fireEvent.change(screen.getByTestId('upload-file-input'), {
        target: { files },
      });
    });

    expect(screen.getByText('hello.txt')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    expect(onSubmit).toBeCalledWith(expect.objectContaining(expectedResponse));
  });

  test('Reference input', async () => {
    const onSubmit = jest.fn();

    await setup({
      questionnaire: {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'q1',
            type: QuestionnaireItemType.reference,
            text: 'q1',
          },
        ],
      },
      onSubmit,
    });

    const input = screen.getByTestId('reference-input-resource-type-input');
    expect(input).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    expect(onSubmit).toBeCalled();
  });
});

function getAnswer(response: QuestionnaireResponse, linkId: string): QuestionnaireResponseItemAnswer | undefined {
  return getAnswerFromItems(response.item as QuestionnaireResponseItem[], linkId);
}

function getAnswerFromItems(
  items: QuestionnaireResponseItem[],
  linkId: string
): QuestionnaireResponseItemAnswer | undefined {
  for (const item of items) {
    if (item.linkId === linkId) {
      return (item.answer as QuestionnaireResponseItemAnswer[])[0];
    }
    if (item.item) {
      const answer = getAnswerFromItems(item.item as QuestionnaireResponseItem[], linkId);
      if (answer) {
        return answer;
      }
    }
  }

  return undefined;
}
