# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PlanLimit
      extend Peal::Internal::Types::Enum

      CHANNELS = "channels"
      MEMBERS = "members"
      SCHEDULED_POSTS = "scheduledPosts"
      ASSISTANT_REQUESTS = "assistantRequests"
    end
  end
end
