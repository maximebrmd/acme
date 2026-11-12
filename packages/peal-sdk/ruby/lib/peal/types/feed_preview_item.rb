# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FeedPreviewItem < Internal::Types::Model
      field :link, -> { String }, optional: false, nullable: true

      field :picture, -> { String }, optional: false, nullable: true

      field :published_at, -> { String }, optional: false, nullable: true, api_name: "publishedAt"

      field :summary, -> { String }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: true

      field :title, -> { String }, optional: false, nullable: true
    end
  end
end
