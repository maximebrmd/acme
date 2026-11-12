# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerUsageReportDay < Internal::Types::Model
      field :by_platform, -> { Internal::Types::Array[Peal::Types::PlatformPosts] }, optional: false, nullable: false, api_name: "byPlatform"

      field :channels, -> { Integer }, optional: false, nullable: true

      field :day, -> { String }, optional: false, nullable: false

      field :published_posts, -> { Integer }, optional: false, nullable: false, api_name: "publishedPosts"

      field :workspaces, -> { Integer }, optional: false, nullable: true
    end
  end
end
