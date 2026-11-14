# frozen_string_literal: true

module Peal
  module Articles
    module Types
      class NewArticle < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :body, -> { Peal::Types::ArticleBody }, optional: false, nullable: false

        field :categories, -> { Internal::Types::Array[String] }, optional: true, nullable: false

        field :cover_media_id, -> { String }, optional: true, nullable: true, api_name: "coverMediaId"

        field :excerpt, -> { String }, optional: true, nullable: true

        field :site_status, -> { Peal::Types::ArticleSiteStatus }, optional: true, nullable: false, api_name: "siteStatus"

        field :tags, -> { Internal::Types::Array[String] }, optional: true, nullable: false

        field :title, -> { String }, optional: false, nullable: false

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :schedule, -> { Peal::Types::ArticleTime }, optional: true, nullable: false
      end
    end
  end
end
