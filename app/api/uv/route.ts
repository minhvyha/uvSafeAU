import { NextRequest, NextResponse } from 'next/server'

const OPENUV_API_KEY = process.env.OPENUV_API_KEY || 'openuv-10mpzormkuidf2g-io'
const OPENUV_BASE_URL = 'https://api.openuv.io/api/v1/uv'
const OPENUV_FORECAST_URL = 'https://api.openuv.io/api/v1/forecast'

export interface UVData {
  uv: number
  uv_time: string
  uv_max: number
  uv_max_time: string
  ozone: number
  ozone_time: string
  safe_exposure_time: {
    st1: number | null
    st2: number | null
    st3: number | null
    st4: number | null
    st5: number | null
    st6: number | null
  }
  sun_info: {
    sun_times: {
      solarNoon: string
      nadir: string
      sunrise: string
      sunset: string
      sunriseEnd: string
      sunsetStart: string
      dawn: string
      dusk: string
      nauticalDawn: string
      nauticalDusk: string
      nightEnd: string
      night: string
      goldenHourEnd: string
      goldenHour: string
    }
    sun_position: {
      azimuth: number
      altitude: number
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const alt = searchParams.get('alt') || '0'
  const dt = searchParams.get('dt') || ''

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat and lng' },
      { status: 400 }
    )
  }

  try {
    let url = `${OPENUV_BASE_URL}?lat=${lat}&lng=${lng}&alt=${alt}`
    if (dt) {
      url += `&dt=${dt}`
    }

    const response = await fetch(url, {
      headers: {
        'x-access-token': OPENUV_API_KEY,
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 300, // Cache for 5 minutes
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenUV API error:', response.status, errorText)
      
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'API key invalid or rate limit exceeded' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: `OpenUV API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Also fetch forecast data
    let forecast = null
    try {
      const forecastResponse = await fetch(
        `${OPENUV_FORECAST_URL}?lat=${lat}&lng=${lng}`,
        {
          headers: {
            'x-access-token': OPENUV_API_KEY,
            'Content-Type': 'application/json',
          },
          next: {
            revalidate: 300,
          },
        }
      )

      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json()
        forecast = forecastData.result
      }
    } catch (forecastError) {
      console.error('Error fetching forecast:', forecastError)
    }
    
    return NextResponse.json({
      success: true,
      result: data.result as UVData,
      forecast,
    })
  } catch (error) {
    console.error('Error fetching UV data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch UV data' },
      { status: 500 }
    )
  }
}
