export interface IAppVersionList {
  'app_name': string,
  'build_number': number,
  'created_at': string,
  'description': string,
  'id': string,
  'markets': [
    {
      'created_at': string,
      'icon': string,
      'name': {
        'en': string,
        'fa': string
      },
      'platform': string,
      'published': boolean,
      'published_at': string,
      'updated_at': string,
      'url': string
    },
    {
      'created_at': string,
      'icon': string,
      'name': {
        'en': string,
        'fa': string
      },
      'platform': string,
      'published': boolean,
      'published_at': string,
      'updated_at': string,
      'url': string
    }
  ],
  'published': boolean,
  'published_at': string,
  'updated_at': string,
  'version': string
}
