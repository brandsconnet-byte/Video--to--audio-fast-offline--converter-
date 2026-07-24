import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.NEXT_PUBLIC_POLAR_ACCESS_TOKEN,
});

export default polar;
