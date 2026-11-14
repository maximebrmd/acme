# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Article < Internal::Types::Model
      field :author_id, -> { String }, optional: false, nullable: true, api_name: "authorId"

      field :body, -> { Peal::Types::ArticleBody }, optional: false, nullable: false

      field :categories, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :cover_media_id, -> { String }, optional: false, nullable: true, api_name: "coverMediaId"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :excerpt, -> { String }, optional: false, nullable: true

      field :id, -> { String }, optional: false, nullable: false

      field :site_status, -> { Peal::Types::ArticleSiteStatus }, optional: false, nullable: false, api_name: "siteStatus"

      field :state, -> { Peal::Types::ArticleState }, optional: false, nullable: false

      field :tags, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"
    end
  end
end
