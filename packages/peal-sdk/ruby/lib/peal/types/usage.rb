# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Usage < Internal::Types::Model
      field :assistant_requests, -> { Peal::Types::PeriodUsage }, optional: false, nullable: false, api_name: "assistantRequests"

      field :channels, -> { Integer }, optional: false, nullable: false

      field :media_storage, -> { Integer }, optional: false, nullable: false, api_name: "mediaStorage"

      field :members, -> { Integer }, optional: false, nullable: false

      field :scheduled_posts, -> { Peal::Types::PeriodUsage }, optional: false, nullable: false, api_name: "scheduledPosts"
    end
  end
end
