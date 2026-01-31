import type { Schema, Struct } from '@strapi/strapi';

export interface ActivityTimetableActivity extends Struct.ComponentSchema {
  collectionName: 'components_activity_timetable_activities';
  info: {
    displayName: 'Timetable Activity';
    icon: 'clock';
  };
  attributes: {
    activityName: Schema.Attribute.String & Schema.Attribute.Required;
    activityNote: Schema.Attribute.Text;
    endTime: Schema.Attribute.Time;
    startTime: Schema.Attribute.Time & Schema.Attribute.Required;
  };
}

export interface PlaceMonastery extends Struct.ComponentSchema {
  collectionName: 'components_place_monasteries';
  info: {
    displayName: 'Monastery';
    icon: 'pinMap';
  };
  attributes: {
    closingHour: Schema.Attribute.Time;
    coverImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    monasteryAddress: Schema.Attribute.String & Schema.Attribute.Required;
    monasteryDescription: Schema.Attribute.String;
    monasteryName: Schema.Attribute.String & Schema.Attribute.Required;
    openingHour: Schema.Attribute.Time;
  };
}

export interface ResponseBlogResponse extends Struct.ComponentSchema {
  collectionName: 'components_response_blog_responses';
  info: {
    displayName: 'Blog Response';
  };
  attributes: {
    responseContent: Schema.Attribute.Blocks & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface ResponseVideoResponse extends Struct.ComponentSchema {
  collectionName: 'components_response_video_responses';
  info: {
    displayName: 'Video Response';
  };
  attributes: {
    title: Schema.Attribute.String;
    videoLink: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'activity.timetable-activity': ActivityTimetableActivity;
      'place.monastery': PlaceMonastery;
      'response.blog-response': ResponseBlogResponse;
      'response.video-response': ResponseVideoResponse;
    }
  }
}
