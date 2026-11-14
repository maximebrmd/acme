# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleInput < Internal::Types::Model
      field :body, -> { Peal::Types::ArticleBody }, optional: false, nullable: false

      field :categories, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :cover_media_id, -> { String }, optional: true, nullable: true, api_name: "coverMediaId"

      field :excerpt, -> { String }, optional: true, nullable: true

      field :site_status, -> { Peal::Types::ArticleSiteStatus }, optional: true, nullable: false, api_name: "siteStatus"

      field :tags, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :title, -> { String }, optional: false, nullable: false
    end
  end
end
