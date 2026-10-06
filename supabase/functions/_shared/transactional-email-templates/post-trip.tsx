import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  serviceTitle?: string
  date?: string
}

const PostTripEmail = ({ name, serviceTitle, date }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Obrigado por viajar com a Rotas do Éden</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Rotas do Éden</Text>
        <Heading style={h1}>{name ? `Obrigado, ${name}.` : 'Obrigado pela sua viagem.'}</Heading>
        <Text style={text}>
          {serviceTitle
            ? `Esperamos que tenha gostado de “${serviceTitle}”${date ? `, no dia ${date}` : ''}.`
            : 'Esperamos que tenha gostado da sua experiência em São Tomé e Príncipe.'}
        </Text>
        <Text style={text}>
          Foi um prazer receber-lhe nas ilhas. Se quiser partilhar alguma impressão sobre a experiência, basta responder
          ao contacto da nossa equipa em info@rotasdoeden.com.
        </Text>
        <Hr style={hr} />
        <Text style={small}>Rotas do Éden · São Tomé e Príncipe</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PostTripEmail,
  subject: 'Obrigado por viajar com a Rotas do Éden',
  displayName: 'Pós-viagem',
  previewData: { name: 'Ana', serviceTitle: 'Passeio de barco', date: '12/10/2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Work Sans", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { color: '#2D6A4F', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 24px' }
const h1 = { color: '#173D35', fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, margin: '0 0 18px' }
const text = { color: '#3d4a45', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px' }
const hr = { borderColor: '#e6e1d6', margin: '28px 0 16px' }
const small = { color: '#7a857f', fontSize: '12px', margin: 0 }
