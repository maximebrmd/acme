# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaUsage < Internal::Types::Model
      field :drafts, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :scheduled, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :draft_articles, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "draftArticles"

      field :scheduled_articles, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "scheduledArticles"
    end
  end
end
