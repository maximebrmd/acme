# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module LinkedInConnection
      extend Peal::Internal::Types::Enum

      LINKEDIN_PROFILE = "linkedinProfile"
      LINKEDIN_PAGE = "linkedinPage"
    end
  end
end
