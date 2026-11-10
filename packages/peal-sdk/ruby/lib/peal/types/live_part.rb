# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LivePart < Internal::Types::Model
      field :index, -> { Integer }, optional: false, nullable: false

      field :permalink, -> { String }, optional: false, nullable: true

      field :platform_post_id, -> { String }, optional: false, nullable: true, api_name: "platformPostId"

      field :published_at, -> { String }, optional: false, nullable: false, api_name: "publishedAt"
    end
  end
end
