# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ApprovalPolicy
      extend Peal::Internal::Types::Enum

      NEVER = "never"
      CONTRIBUTORS_AND_APPLICATIONS = "contributorsAndApplications"
      ALWAYS = "always"
    end
  end
end
