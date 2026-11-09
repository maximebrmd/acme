# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlanAllowances < Internal::Types::Model
      field :assistant_requests, -> { Integer }, optional: false, nullable: true, api_name: "assistantRequests"

      field :channels, -> { Integer }, optional: false, nullable: true

      field :media_storage, -> { Integer }, optional: false, nullable: true, api_name: "mediaStorage"

      field :members, -> { Integer }, optional: false, nullable: true

      field :scheduled_posts, -> { Integer }, optional: false, nullable: true, api_name: "scheduledPosts"
    end
  end
end
