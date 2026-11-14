# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleStatePublished < Internal::Types::Model
      field :scheduled_at, -> { String }, optional: false, nullable: false, api_name: "scheduledAt"

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :edited_at, -> { String }, optional: false, nullable: true, api_name: "editedAt"

      field :permalink, -> { String }, optional: false, nullable: true

      field :platform_post_id, -> { String }, optional: false, nullable: false, api_name: "platformPostId"

      field :published_at, -> { String }, optional: false, nullable: false, api_name: "publishedAt"

      field :removed_at, -> { String }, optional: false, nullable: true, api_name: "removedAt"
    end
  end
end
