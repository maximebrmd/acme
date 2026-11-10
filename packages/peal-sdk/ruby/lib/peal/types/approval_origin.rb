# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ApprovalOrigin
      extend Peal::Internal::Types::Enum

      MEMBER = "member"
      API_KEY = "apiKey"
      APPLICATION = "application"
    end
  end
end
