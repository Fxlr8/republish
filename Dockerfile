FROM node:alpine

RUN apk update \
    && apk add -f --no-cache \
		postgresql-10


RUN mkdir -p /opt/app

# install dependencies first, in a different location for easier app bind mounting for local development
WORKDIR /opt
COPY package.json package-lock.json* ./
ENV PATH /opt/node_modules/.bin:$PATH
ENV NODE_PATH /opt/node_modules:/opt/app/src/server:$NODE_PATH
RUN npm install --quiet && npm cache clean --force

# copy in our source code last, as it changes the most
COPY . /opt/app
WORKDIR /opt/app

RUN npm run build

# defaults to production, compose overrides this to development on build and run
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

# run as node user instead of root for security reasons
USER node


# if you want to use npm start instead, then use `docker run --init in production`
# so that signals are passed properly. Note the code in index.js is needed to catch Docker signals
# using node here is still more graceful stopping then npm with --init afaik
# I still can't come up with a good production way to run with npm and graceful shutdown
CMD [ "node", "dist/main.js" ]

# docker run -it -d --name overcase-admin -v $PWD:/opt/app --network=reverse-proxy overcase-admin
