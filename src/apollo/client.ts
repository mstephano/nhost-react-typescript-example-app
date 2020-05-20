import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { setContext } from "apollo-link-context";
import { WebSocketLink } from "apollo-link-ws";
import { createHttpLink } from "apollo-link-http";
import { from, split } from "apollo-link";
import { getMainDefinition } from "apollo-utilities";
import { OperationDefinitionNode } from "graphql";
import * as config from "../config";

export function createApolloClient(apollo_headers: any = {}) {
  const uri = config.GRAPHQL_ENDPOINT;

  const wsUri = uri.replace(
    /^https?/,
    process.env.NODE_ENV === "development" ? "ws" : "wss"
  );

  const wsLink = new WebSocketLink({
    uri: wsUri,
    options: {
      lazy: true,
      reconnect: true,
      connectionParams: () => {
        return { headers: apollo_headers };
      },
    },
  });

  const httpLink = createHttpLink({
    uri,
  });
  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      ...apollo_headers,
    },
  }));

  // const retryLink = new RetryLink();

  const terminatingLink = split(
    ({ query }: any) => {
      const { kind, operation } = getMainDefinition(
        query
      ) as OperationDefinitionNode;
      return kind === "OperationDefinition" && operation === "subscription";
    },
    wsLink,
    authLink.concat(httpLink)
  );

  const client = new ApolloClient({
    link: from([terminatingLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });

  // const client = new ApolloClient({
  //   link: authLink.concat(link), //from([terminatingLink]),
  //   cache,
  //   defaultOptions: {
  //     watchQuery: {
  //       fetchPolicy: "cache-and-network",
  //     },
  //   },
  // });

  return client;
}
