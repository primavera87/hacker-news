/**  * @jest-environment jsdom-sixteen  */
import React from 'react';
import { render, screen, waitForElementToBeRemoved } from './test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

import App from './App';
import { HackerNewsStory } from './models';

const getFakeStory = (id: number): HackerNewsStory => ({
  id: id,
  by: 'John Doe',
  descendants: id * 3,
  score: id * 2,
  time: 1594541351,
  title: `Best Hacker News Story #${id}`,
  type: 'story',
  url: 'https://mario.dev',
});

const server = setupServer(
  rest.get(
    'https://hacker-news.firebaseio.com/v0/newstories.json',
    (req, res, ctx) => {
      return res(ctx.json([1, 2, 3]));
    }
  ),
  rest.get(
    'https://hacker-news.firebaseio.com/v0/item/1.json',
    (req, res, ctx) => {
      return res(ctx.json(getFakeStory(1)));
    }
  ),
  rest.get(
    'https://hacker-news.firebaseio.com/v0/item/2.json',
    (req, res, ctx) => {
      return res(ctx.json(getFakeStory(2)));
    }
  ),
  rest.get(
    'https://hacker-news.firebaseio.com/v0/item/3.json',
    (req, res, ctx) => {
      return res(ctx.json(getFakeStory(3)));
    }
  )
);

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

it('should render newest stories', async () => {
  render(<App />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  const title1 = await screen.findByText('Best Hacker News Story #1');
  expect(title1).toBeInTheDocument();
  const title2 = await screen.findByText('Best Hacker News Story #2');
  expect(title2).toBeInTheDocument();
  const title3 = await screen.findByText('Best Hacker News Story #3');
  expect(title3).toBeInTheDocument();

  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  expect(screen.getByText(/no more stories/i)).toBeInTheDocument();
});

it('should render previously cached stories if offline', async () => {
  const { unmount } = render(<App />);

  await screen.findByText('Best Hacker News Story #1');
  await screen.findByText('Best Hacker News Story #2');
  await screen.findByText('Best Hacker News Story #3');

  unmount();

  const anyRequestMock = jest.fn();
  server.use(
    rest.get(
      'https://hacker-news.firebaseio.com/v0/newstories.json',
      (req, res, ctx) => {
        anyRequestMock();
        return res(ctx.status(500));
      }
    ),
    rest.get(
      'https://hacker-news.firebaseio.com/v0/item/1.json',
      (req, res, ctx) => {
        anyRequestMock();
        return res(ctx.status(500));
      }
    ),
    rest.get(
      'https://hacker-news.firebaseio.com/v0/item/2.json',
      (req, res, ctx) => {
        anyRequestMock();
        return res(ctx.status(500));
      }
    ),
    rest.get(
      'https://hacker-news.firebaseio.com/v0/item/3.json',
      (req, res, ctx) => {
        anyRequestMock();
        return res(ctx.status(500));
      }
    )
  );

  render(<App />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  const title1 = await screen.findByText('Best Hacker News Story #1');
  expect(title1).toBeInTheDocument();
  const title2 = await screen.findByText('Best Hacker News Story #2');
  expect(title2).toBeInTheDocument();
  const title3 = await screen.findByText('Best Hacker News Story #3');
  expect(title3).toBeInTheDocument();

  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  expect(anyRequestMock).toHaveBeenCalled();
});

it('should handle server error retrieving the newest stories', async () => {
  server.use(
    rest.get(
      'https://hacker-news.firebaseio.com/v0/newstories.json',
      (req, res, ctx) => {
        return res(ctx.status(500));
      }
    )
  );

  render(<App />);

  const loadingElement = screen.getByText('Loading...');
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitForElementToBeRemoved(loadingElement);
  expect(screen.getByText('Something went wrong retrieving new stories'));
});
